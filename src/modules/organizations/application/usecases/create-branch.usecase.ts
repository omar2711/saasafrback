import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import { BranchEntity } from '../../domain/entities/branch.entity';
import { CreateBranchDto } from '../../presentation/dto/create-branch.dto';
import {
  assertManagerBelongsToOrg,
  BRANCH_COLUMNS,
  BranchRow,
  clearOtherMainBranches,
  mapBranch,
} from '../branch-helpers';

@Injectable()
export class CreateBranchUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, dto: CreateBranchDto): Promise<BranchEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const branch = await this.db.withRls(context, async (client) => {
      if (dto.managerMemberId) {
        await assertManagerBelongsToOrg(client, orgId, dto.managerMemberId);
      }

      if (dto.isMain) {
        await clearOtherMainBranches(client, orgId);
      }

      const [created] = await client.query<BranchRow>(
        `INSERT INTO branches (org_id, name, address, city, phone, status, manager_member_id, is_main)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $7)
         RETURNING ${BRANCH_COLUMNS}`,
        [
          orgId,
          dto.name.trim(),
          dto.address?.trim() || null,
          dto.city?.trim() || null,
          dto.phone?.trim() || null,
          dto.managerMemberId ?? null,
          dto.isMain ?? false,
        ],
      );

      return created;
    });

    return mapBranch(branch);
  }
}
