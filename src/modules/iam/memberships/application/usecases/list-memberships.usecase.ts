import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { MembershipEntity } from '../../domain/entities/membership.entity';

interface MembershipRow {
  id: string;
  org_id: string;
  user_id: string;
  status: string;
  branch_id: string | null;
  tax_id: string | null;
  created_at: Date;
  updated_at: Date;
  role_ids: string[] | null;
}

@Injectable()
export class ListMembershipsUseCase {
  constructor(private readonly db: DbService) {}

  async listByOrg(context: RlsContext): Promise<MembershipEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const memberships = await this.db.withRls(context, (client) =>
      client.query<MembershipRow>(
        `SELECT om.id, om.org_id, om.user_id, om.status, om.branch_id, om.tax_id, om.created_at, om.updated_at,
                array_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL) AS role_ids
         FROM org_members om
         LEFT JOIN user_roles ur ON ur.org_member_id = om.id
         WHERE om.org_id = $1 AND om.deleted_at IS NULL
         GROUP BY om.id`,
        [orgId],
      ),
    );

    return memberships.map((m) => ({
      id: m.id,
      orgId: m.org_id,
      userId: m.user_id,
      roleIds: m.role_ids ?? [],
      branchId: m.branch_id ?? null,
      // Se seleccionaba pero no se mapeaba: el formulario de edicion mostraba el
      // NIT siempre vacio y lo reenviaba vacio al guardar.
      taxId: m.tax_id ?? null,
      status: m.status as MembershipEntity['status'],
      createdAt: m.created_at.toISOString(),
      updatedAt: m.updated_at.toISOString(),
    }));
  }

  async listByUser(context: RlsContext): Promise<MembershipEntity[]> {
    const userId = context.userId;
    if (!userId) {
      throw new ForbiddenException('User context missing');
    }

    const memberships = await this.db.withRls(context, (client) =>
      client.query<MembershipRow>(
        `SELECT om.id, om.org_id, om.user_id, om.status, om.branch_id, om.tax_id, om.created_at, om.updated_at,
                array_agg(ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL) AS role_ids
         FROM org_members om
         LEFT JOIN user_roles ur ON ur.org_member_id = om.id
         WHERE om.user_id = $1 AND om.deleted_at IS NULL
         GROUP BY om.id`,
        [userId],
      ),
    );

    return memberships.map((m) => ({
      id: m.id,
      orgId: m.org_id,
      userId: m.user_id,
      roleIds: m.role_ids ?? [],
      branchId: m.branch_id ?? null,
      taxId: m.tax_id ?? null,
      status: m.status as MembershipEntity['status'],
      createdAt: m.created_at.toISOString(),
      updatedAt: m.updated_at.toISOString(),
    }));
  }
}
