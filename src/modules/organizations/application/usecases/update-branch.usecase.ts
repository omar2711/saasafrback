import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import { BranchEntity } from '../../domain/entities/branch.entity';
import { UpdateBranchDto } from '../../presentation/dto/update-branch.dto';
import {
  assertManagerBelongsToOrg,
  BRANCH_COLUMNS,
  BranchRow,
  clearOtherMainBranches,
  mapBranch,
} from '../branch-helpers';

@Injectable()
export class UpdateBranchUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, branchId: string, dto: UpdateBranchDto): Promise<BranchEntity> {
    const branch = await this.db.withRls(context, async (client) => {
      const [current] = await client.query<{ org_id: string }>(
        `SELECT org_id FROM branches WHERE id = $1 AND deleted_at IS NULL`,
        [branchId],
      );
      if (!current) return null;

      if (dto.managerMemberId) {
        await assertManagerBelongsToOrg(client, current.org_id, dto.managerMemberId);
      }

      if (dto.isMain) {
        await clearOtherMainBranches(client, current.org_id, branchId);
      }

      const [updated] = await client.query<BranchRow>(
        `UPDATE branches
         SET name = COALESCE($1::text, name),
             address = COALESCE($2::text, address),
             city = COALESCE($3::text, city),
             phone = COALESCE($4::text, phone),
             status = COALESCE($5::text, status),
             manager_member_id = CASE WHEN $7::boolean THEN $8::uuid ELSE manager_member_id END,
             is_main = COALESCE($9::boolean, is_main)
         WHERE id = $6
         RETURNING ${BRANCH_COLUMNS}`,
        [
          // COALESCE y no `name = $1`: cambiar solo el estado desde la lista no
          // manda el nombre, y sin COALESCE se escribia NULL en una columna
          // NOT NULL.
          dto.name?.trim() || null,
          dto.address ?? null,
          dto.city ?? null,
          dto.phone ?? null,
          dto.status ?? null,
          branchId,
          // "Campo presente": con COALESCE nunca se podria QUITAR el encargado.
          dto.managerMemberId !== undefined,
          dto.managerMemberId ?? null,
          dto.isMain ?? null,
        ],
      );

      return updated;
    });

    if (!branch) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    return mapBranch(branch);
  }
}
