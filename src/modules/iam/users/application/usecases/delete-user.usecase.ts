import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { AuditService } from '../../../../../common/audit/audit.service';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async execute(context: RlsContext, id: string): Promise<void> {
    if (context.userId === id) {
      throw new BadRequestException('No puedes eliminar tu propio usuario');
    }

    await this.db.withRls(context, async (client) => {
      const [user] = await client.query<{ id: string; email: string }>(
        `SELECT id, email FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [id],
      );

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      await client.execute(
        `UPDATE users SET deleted_at = now(), status = 'disabled' WHERE id = $1`,
        [id],
      );
      await client.execute(`DELETE FROM user_roles WHERE org_member_id IN (SELECT id FROM org_members WHERE user_id = $1)`, [id]);

      await this.audit.recordInTransaction(client, context, {
        action: 'user.delete',
        entityType: 'user',
        entityId: id,
        metadata: { email: user.email },
      });
    });
  }
}