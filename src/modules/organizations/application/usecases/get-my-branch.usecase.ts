import { Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';

export interface MyProfile {
  assignedBranchId: string | null;
  userName: string | null;
  roleNames: string[];
}

@Injectable()
export class GetMyBranchUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext): Promise<MyProfile> {
    if (!context.orgId || !context.memberId) {
      return { assignedBranchId: null, userName: null, roleNames: [] };
    }

    return this.db.withRls(context, async (client) => {
      const branchRows = await client.query<{ branch_id: string | null }>(
        `SELECT branch_id FROM org_members WHERE id = $1`,
        [context.memberId],
      );

      const userRows = context.userId
        ? await client.query<{ full_name: string }>(
            `SELECT full_name FROM users WHERE id = $1`,
            [context.userId],
          )
        : [];

      const roleRows = await client.query<{ name: string }>(
        `SELECT r.name
           FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
          WHERE ur.org_member_id = $1
          ORDER BY r.name`,
        [context.memberId],
      );

      return {
        assignedBranchId: branchRows[0]?.branch_id ?? null,
        userName: userRows[0]?.full_name ?? null,
        roleNames: roleRows.map((r) => r.name),
      };
    });
  }
}