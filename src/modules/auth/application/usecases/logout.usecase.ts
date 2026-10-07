import { Injectable } from '@nestjs/common';
import { JwtUser } from '../../../../common/auth/jwt-user';
import { DbService, RlsContext } from '../../../../database/db.service';
import { AuditService } from '../../../../common/audit/audit.service';
import { LogoutDto } from '../../presentation/dto/logout.dto';

@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async execute(user: JwtUser | undefined, dto: LogoutDto): Promise<{ revoked: boolean }> {
    const sessionId = dto.sessionId ?? user?.sessionId;
    if (!sessionId) {
      return { revoked: false };
    }

    const context: RlsContext = {
      userId: user?.sub ?? null,
      isSuperAdmin: user?.isSuperAdmin ?? false,
    };

    await this.db.withRls(context, async (client) => {
      await client.execute(
        `UPDATE sessions SET revoked = true, revoked_at = NOW() WHERE id = $1`,
        [sessionId],
      );

      await this.audit.recordInTransaction(client, context, {
        action: 'logout',
        entityType: 'session',
        entityId: sessionId,
      });
    });

    return { revoked: true };
  }
}
