import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { RoleEntity } from '../../domain/entities/role.entity';

interface RoleWithPermissionsRow {
  id: string;
  org_id: string;
  name: string;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
  permission_ids: string[] | null;
}

@Injectable()
export class ListRolesUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext): Promise<RoleEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const roles = await this.db.withRls(context, (client) =>
      client.query<RoleWithPermissionsRow>(
        `SELECT r.id, r.org_id, r.name, r.is_system, r.created_at, r.updated_at,
                array_agg(rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL) AS permission_ids
         FROM roles r
         LEFT JOIN role_permissions rp ON rp.role_id = r.id
         WHERE r.org_id = $1 AND r.deleted_at IS NULL
         GROUP BY r.id
         ORDER BY r.created_at ASC`,
        [orgId],
      ),
    );

    return roles.map((role) => ({
      id: role.id,
      orgId: role.org_id,
      name: role.name,
      isSystem: role.is_system,
      permissions: role.permission_ids ?? [],
      createdAt: role.created_at.toISOString(),
      updatedAt: role.updated_at.toISOString(),
    }));
  }
}
