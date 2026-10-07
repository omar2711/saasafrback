import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtUser } from '../auth/jwt-user';
import { resolveIsSuperAdmin } from '../auth/super-admin';
import { DbService } from '../../database/db.service';

type RequestWithUser = Request & {
  user?: JwtUser;
  tenant?: { orgId?: string };
};

interface JwtPayload {
  sub: string;
  email?: string;
  sessionId?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly db: DbService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = extractBearerToken(request);
    const secret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ??
      'dev_access_secret_change_me';

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
      });
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }

    const configuredAdmin = resolveIsSuperAdmin(payload, this.configService);
    const [account] = await this.db.withContextQuery<
      { platform_role: 'super_admin' | 'accountant' | null }[]
    >(payload.sub, null, configuredAdmin, (c) =>
      c.query(
        'SELECT platform_role FROM users WHERE id=$1 AND deleted_at IS NULL',
        [payload.sub],
      ),
    );
    const platformRole =
      account?.platform_role ?? (configuredAdmin ? 'super_admin' : null);
    const isSuperAdmin = platformRole === 'super_admin';

    await this.assertSessionIsUsable(payload, isSuperAdmin);

    if (
      platformRole === 'accountant' &&
      !(
        request.path.startsWith('/auth/') ||
        (request.method === 'GET' && request.path === '/admin/finance') ||
        request.path.startsWith('/legal/')
      )
    )
      throw new ForbiddenException(
        'El contable solo tiene acceso de lectura al movimiento económico.',
      );

    request.user = {
      sub: payload.sub,
      email: payload.email,
      sessionId: payload.sessionId,
      isSuperAdmin,
      platformRole,
    };

    return true;
  }

  /**
   * El access token dura 15 minutos y hasta ahora no se comprobaba nada contra
   * la base: cerrar sesion o deshabilitar a un usuario no surtia efecto hasta
   * que el token caducaba solo. Una consulta por request, ambas busquedas por
   * clave primaria.
   */
  private async assertSessionIsUsable(
    payload: JwtPayload,
    isSuperAdmin: boolean,
  ): Promise<void> {
    const rows = await this.db.withContextQuery<SessionStateRow[]>(
      payload.sub,
      null,
      isSuperAdmin,
      (client) =>
        client.query<SessionStateRow>(
          `SELECT u.status AS user_status,
                  u.deleted_at IS NOT NULL AS user_deleted,
                  s.revoked AS session_revoked,
                  s.expires_at < now() AS session_expired
           FROM users u
           LEFT JOIN sessions s ON s.id = $2::uuid AND s.user_id = u.id
           WHERE u.id = $1::uuid`,
          [payload.sub, payload.sessionId ?? null],
        ),
    );

    const state = rows[0];
    if (!state || state.user_deleted || state.user_status !== 'active') {
      throw new UnauthorizedException({
        message: 'Tu cuenta esta deshabilitada. Contacta al administrador.',
        code: 'ACCOUNT_DISABLED',
      });
    }

    // session_revoked llega null cuando el token no trae sessionId (tokens
    // emitidos antes de que existiera este control). Se acepta para no expulsar
    // a todo el mundo en el despliegue; el token caduca igual en 15 minutos.
    if (state.session_revoked === true || state.session_expired === true) {
      throw new UnauthorizedException({
        message: 'La sesion ha finalizado. Inicia sesion de nuevo.',
        code: 'SESSION_REVOKED',
      });
    }
  }
}

interface SessionStateRow {
  user_status: string;
  user_deleted: boolean;
  session_revoked: boolean | null;
  session_expired: boolean | null;
}

const extractBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization ?? req.headers.Authorization;
  if (!header || Array.isArray(header)) {
    return null;
  }

  const [type, token] = header.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
};

// resolveIsSuperAdmin se movio a common/auth/super-admin.ts: el gateway de
// soporte lo necesita tambien y el handshake del WebSocket no pasa por aqui.
