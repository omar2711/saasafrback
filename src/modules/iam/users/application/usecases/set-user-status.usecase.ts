import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { AuditService } from '../../../../../common/audit/audit.service';
import { UserEntity } from '../../domain/entities/user.entity';
import { SetUserStatusDto } from '../../presentation/dto/set-user-status.dto';
import { mapUser, UserRow } from '../user.mapper';

@Injectable()
export class SetUserStatusUseCase {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async execute(context: RlsContext, id: string, dto: SetUserStatusDto): Promise<UserEntity> {
    const users = await this.db.withRls(context, async (client) => {
      const [before] = await client.query<UserRow>('SELECT status FROM users WHERE id = $1', [id]);

      const rows = await client.query<UserRow>(
        `UPDATE users SET status = $1
         WHERE id = $2
         RETURNING id, email, full_name, phone, status, created_at, updated_at, deleted_at`,
        [dto.status, id],
      );

      if (rows[0]) {
        await this.audit.recordInTransaction(client, context, {
          action: 'user.status_change',
          entityType: 'user',
          entityId: id,
          metadata: {
            email: rows[0].email,
            previousStatus: before?.status ?? null,
            newStatus: rows[0].status,
          },
        });
      }

      return rows;
    });

    if (!users[0]) {
      throw new NotFoundException('User not found');
    }

    return mapUser(users[0]);
  }
}
