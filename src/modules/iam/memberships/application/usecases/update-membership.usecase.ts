import { Injectable, NotFoundException } from '@nestjs/common';
import { ConflictException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { MembershipEntity } from '../../domain/entities/membership.entity';
import { UpdateMembershipDto } from '../../presentation/dto/update-membership.dto';

interface MembershipRow {
  id: string;
  org_id: string;
  user_id: string;
  status: string;
  branch_id: string | null;
  tax_id: string | null;
  created_at: Date;
  updated_at: Date;
}

interface UserRoleRow {
  role_id: string;
}

@Injectable()
export class UpdateMembershipUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, id: string, dto: UpdateMembershipDto): Promise<MembershipEntity> {
    const result = await this.db.withRls(context, async (client) => {
      const existing = await client.query<MembershipRow>(
        'SELECT id FROM org_members WHERE id = $1',
        [id],
      );
      if (!existing[0]) return null;

      // Mismo recorte + mayusculas que el indice unico de la migracion 031;
      // cadena vacia = borrar el NIT, por eso el booleano de "campo presente".
      const taxId =
        dto.taxId === undefined ? null : dto.taxId.trim().toUpperCase() || null;

      const [updated] = await client.query<MembershipRow>(
        `UPDATE org_members
         SET status = COALESCE($1, status),
             branch_id = CASE WHEN $3::boolean THEN $4::uuid ELSE branch_id END,
             tax_id = CASE WHEN $5::boolean THEN $6::text ELSE tax_id END,
             updated_at = now()
         WHERE id = $2
         RETURNING id, org_id, user_id, status, branch_id, tax_id, created_at, updated_at`,
        [
          dto.status ?? null,
          id,
          dto.branchId !== undefined,
          dto.branchId ?? null,
          dto.taxId !== undefined,
          taxId,
        ],
      );

      if (dto.roleIds !== undefined) {
        await client.execute('DELETE FROM user_roles WHERE org_member_id = $1', [id]);
        if (dto.roleIds.length > 0) {
          const placeholders = dto.roleIds.map((_, i) => `($1, $${i + 2})`).join(', ');
          await client.execute(
            `INSERT INTO user_roles (org_member_id, role_id) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
            [id, ...dto.roleIds],
          );
        }
      }

      const roles = await client.query<UserRoleRow>(
        'SELECT role_id FROM user_roles WHERE org_member_id = $1',
        [id],
      );

      return { updated, roles };
    }).catch((error: unknown) => {
      const pgError = error as { code?: string; constraint?: string };
      if (pgError?.code === '23505' && pgError?.constraint === 'org_members_org_tax_id_unique') {
        throw new ConflictException('Ya existe un usuario con ese NIT/CI en esta organizacion');
      }
      throw error;
    });

    if (!result) {
      throw new NotFoundException('Membership not found');
    }

    return {
      id: result.updated.id,
      orgId: result.updated.org_id,
      userId: result.updated.user_id,
      roleIds: result.roles.map((r) => r.role_id),
      branchId: result.updated.branch_id ?? null,
      taxId: result.updated.tax_id ?? null,
      status: result.updated.status as MembershipEntity['status'],
      createdAt: result.updated.created_at.toISOString(),
      updatedAt: result.updated.updated_at.toISOString(),
    };
  }
}
