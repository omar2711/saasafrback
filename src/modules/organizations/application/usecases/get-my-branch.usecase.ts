import { Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';

@Injectable()
export class GetMyBranchUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext): Promise<{ assignedBranchId: string | null }> {
    if (!context.orgId || !context.memberId) {
      return { assignedBranchId: null };
    }

    const rows = await this.db.withRls(context, (client) =>
      client.query<{ branch_id: string | null }>(
        `SELECT branch_id FROM org_members WHERE id = $1`,
        [context.memberId],
      ),
    );

    return { assignedBranchId: rows[0]?.branch_id ?? null };
  }
}
