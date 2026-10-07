import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { hashToken } from '../../../../common/utils/token-hash';
import { DbService } from '../../../../database/db.service';
import { RefreshTokenDto } from '../../presentation/dto/refresh-token.dto';
import { AuthTokensResponse } from './login.usecase';

interface UserRow {
  id: string;
  email: string;
  deleted_at: Date | null;
}

interface SessionRow {
  id: string;
  revoked: boolean;
  expires_at: Date;
  refresh_token_hash: string;
}

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    private readonly db: DbService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: RefreshTokenDto): Promise<AuthTokensResponse> {
    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ?? 'dev_refresh_secret_change_me';
    const accessSecret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ?? 'dev_access_secret_change_me';
    const accessTtl =
      (this.configService.get<string>('JWT_ACCESS_TTL') ?? '15m') as StringValue;
    const refreshTtl =
      (this.configService.get<string>('JWT_REFRESH_TTL') ?? '7d') as StringValue;

    let payload: { sub: string; sessionId?: string };
    try {
      payload = await this.jwtService.verifyAsync<{ sub: string; sessionId?: string }>(
        dto.refreshToken,
        { secret: refreshSecret },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!payload.sessionId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.db.transaction(async (client) => {
      await client.execute('SELECT app.set_context($1::uuid, NULL, NULL, false)', [payload.sub]);

      const users = await client.query<UserRow>(
        'SELECT id, email, deleted_at FROM users WHERE id = $1',
        [payload.sub],
      );
      const user = users[0];
      if (!user || user.deleted_at) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const sessions = await client.query<SessionRow>(
        'SELECT id, revoked, expires_at, refresh_token_hash FROM sessions WHERE id = $1',
        [payload.sessionId],
      );
      const session = sessions[0];
      if (!session || session.revoked) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (session.expires_at < new Date()) {
        await client.execute(
          'UPDATE sessions SET revoked = true, revoked_at = NOW() WHERE id = $1',
          [session.id],
        );
        throw new UnauthorizedException('Refresh token expired');
      }

      const expectedHash = hashToken(dto.refreshToken);
      if (session.refresh_token_hash !== expectedHash) {
        await client.execute(
          'UPDATE sessions SET revoked = true, revoked_at = NOW() WHERE id = $1',
          [session.id],
        );
        throw new UnauthorizedException('Invalid refresh token');
      }

      const accessToken = this.jwtService.sign(
        { sub: payload.sub, email: user.email, sessionId: session.id },
        { secret: accessSecret, expiresIn: accessTtl },
      );
      const refreshToken = this.jwtService.sign(
        { sub: payload.sub, sessionId: session.id },
        { secret: refreshSecret, expiresIn: refreshTtl },
      );
      const refreshPayload = this.jwtService.decode(refreshToken) as { exp?: number } | null;
      const expiresAt = refreshPayload?.exp
        ? new Date(refreshPayload.exp * 1000)
        : new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

      await client.execute(
        'UPDATE sessions SET refresh_token_hash = $1, expires_at = $2, revoked = false WHERE id = $3',
        [hashToken(refreshToken), expiresAt, session.id],
      );

      return {
        accessToken,
        refreshToken,
        sessionId: session.id,
        expiresAt: expiresAt.toISOString(),
      };
    });
  }
}
