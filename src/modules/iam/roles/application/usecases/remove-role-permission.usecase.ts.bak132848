import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { AuditService } from '../../../../../common/audit/audit.service';
import { RoleEntity } from '../../domain/entities/role.entity';

interface RoleRow {
  id: string;
  org_id: string;
  name: string;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

interface PermissionRow {
  permission_id: string;
}

@Injectable()
export class RemoveRolePermissionUseCase {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async execute(context: RlsContext, roleId: string, permissionId: string): Promise<RoleEntity> {
    const result = await this.db.withRls(context, async (client) => {
      const roles = await client.query<RoleRow>(
        'SELECT id, org_id, name, is_system, created_at, updated_at FROM roles WHERE id = $1',
        [roleId],
      );
      if (!roles[0]) return null;

      await client.execute(
        'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [roleId, permissionId],
      );

      const perms = await client.query<PermissionRow>(
        'SELECT permission_id FROM role_permissions WHERE role_id = $1',
        [roleId],
      );

      await this.audit.recordInTransaction(client, context, {
        action: 'role.change',
        entityType: 'role',
        entityId: roleId,
        metadata: {
          roleName: roles[0].name,
          operation: 'revoke',
          permissionId,
        },
      });

      return { role: roles[0], perms };
    });

    if (!result) {
      throw new NotFoundException('Role not found');
    }

    return {
      id: result.role.id,
      orgId: result.role.org_id,
      name: result.role.name,
      isSystem: result.role.is_system,
      permissions: result.perms.map((p) => p.permission_id),
      createdAt: result.role.created_at.toISOString(),
      updatedAt: result.role.updated_at.toISOString(),
    };
  }
}
