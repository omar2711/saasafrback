import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { StringValue } from 'ms';
import { newId } from '../../../../common/utils/ids';
import { hashToken } from '../../../../common/utils/token-hash';
import { DbService } from '../../../../database/db.service';
import { AuditService } from '../../../../common/audit/audit.service';
import { WorkScheduleService } from '../../../../common/schedule/work-schedule.service';
import { LoginDto } from '../../presentation/dto/login.dto';

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresAt: string;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  status: string;
  deleted_at: Date | null;
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly db: DbService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly audit: AuditService,
    private readonly workSchedule: WorkScheduleService,
  ) {}

  async execute(
    dto: LoginDto,
    context?: { ip?: string; userAgent?: string },
  ): Promise<AuthTokensResponse> {
    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ?? 'dev_access_secret_change_me';
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'dev_refresh_secret_change_me';
    const accessTtl =
      (this.configService.get<string>('JWT_ACCESS_TTL') ?? '15m') as StringValue;
    const refreshTtl =
      (this.configService.get<string>('JWT_REFRESH_TTL') ?? '7d') as StringValue;

    const tokens = await this.db.transaction(async (client) => {
      await client.execute('SELECT app.set_context(NULL, NULL, NULL, true)');

      // lower() para que la cuenta creada como "Ana@x.com" tambien entre
      // escribiendo "ana@x.com". users.email es UNIQUE, asi que no puede haber
      // dos filas equivalentes salvo por datos anteriores a esta normalizacion.
      const users = await client.query<UserRow>(
        `SELECT id, email, password_hash, status, deleted_at
         FROM users WHERE lower(email) = lower(btrim($1)) ORDER BY created_at LIMIT 1`,
        [dto.email],
      );
      const user = users[0];
      if (!user || user.deleted_at) {
        throw new UnauthorizedException('Credenciales invalidas');
      }

      const passwordOk = await bcrypt.compare(dto.password, user.password_hash);
      if (!passwordOk) {
        throw new UnauthorizedException('Credenciales invalidas');
      }

      // Un usuario deshabilitado conservaba la contrasena valida y entraba: el
      // status solo se miraba en org_members, no en la cuenta global.
      if (user.status !== 'active') {
        throw new UnauthorizedException({
          message: 'Tu cuenta esta deshabilitada. Contacta al administrador.',
          code: 'ACCOUNT_DISABLED',
        });
      }

      const sessionId = newId();
      const accessToken = this.jwtService.sign(
        { sub: user.id, email: user.email, sessionId },
        { secret: accessSecret, expiresIn: accessTtl },
      );
      const refreshToken = this.jwtService.sign(
        { sub: user.id, sessionId },
        { secret: refreshSecret, expiresIn: refreshTtl },
      );
      const refreshTokenHash = hashToken(refreshToken);
      const refreshPayload = this.jwtService.decode(refreshToken) as { exp?: number } | null;
      const expiresAt = refreshPayload?.exp
        ? new Date(refreshPayload.exp * 1000)
        : new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

      await client.execute('SELECT app.set_context($1::uuid, NULL, NULL, false)', [user.id]);

      await client.execute(
        `INSERT INTO sessions (id, user_id, refresh_token_hash, ip, user_agent, revoked, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          sessionId,
          user.id,
          refreshTokenHash,
          context?.ip ?? null,
          context?.userAgent ?? null,
          false,
          expiresAt,
        ],
      );

      // Dentro de la misma transaccion que la sesion: si el INSERT falla, no
      // queda un "inicio de sesion" registrado que nunca ocurrio. org_id va
      // nulo porque el usuario todavia no eligio organizacion.
      await this.audit.recordInTransaction(
        client,
        { userId: user.id, orgId: null },
        {
          action: 'login',
          entityType: 'session',
          entityId: sessionId,
          ip: context?.ip ?? null,
          userAgent: context?.userAgent ?? null,
          metadata: { email: user.email },
        },
      );

      return {
        userId: user.id,
        response: { accessToken, refreshToken, sessionId, expiresAt: expiresAt.toISOString() },
      };
    });

    // Fuera de la transaccion a proposito: si el horario bloquea, la sesion ya
    // quedo creada y el asiento de login registrado. Interesa saber que alguien
    // intento entrar fuera de hora, y la sesion caduca sola.
    await this.workSchedule.assertCanLogin(tokens.userId);

    return tokens.response;
  }
}
