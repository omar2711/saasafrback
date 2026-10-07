import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import { BranchEntity } from '../../domain/entities/branch.entity';
import { BranchRow, mapBranch } from '../branch-helpers';

@Injectable()
export class ListBranchesUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext): Promise<BranchEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const branches = await this.db.withRls(context, (client) =>
      client.query<BranchRow>(
        `SELECT b.id, b.org_id, b.name, b.address, b.city, b.phone, b.status,
                b.manager_member_id, b.is_main, b.created_at, b.updated_at,
                u.full_name AS manager_name
         FROM branches b
         LEFT JOIN org_members om
           ON om.id = b.manager_member_id AND om.deleted_at IS NULL
         LEFT JOIN users u ON u.id = om.user_id
         WHERE b.org_id = $1 AND b.deleted_at IS NULL
         ORDER BY b.is_main DESC, b.created_at ASC`,
        [orgId],
      ),
    );

    return branches.map(mapBranch);
  }
}
