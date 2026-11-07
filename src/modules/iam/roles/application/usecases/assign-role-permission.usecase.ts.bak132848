import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { AuditService } from '../../../../../common/audit/audit.service';
import { RoleEntity } from '../../domain/entities/role.entity';
import { AssignRolePermissionDto } from '../../presentation/dto/assign-role-permission.dto';

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
export class AssignRolePermissionUseCase {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async execute(context: RlsContext, roleId: string, dto: AssignRolePermissionDto): Promise<RoleEntity> {
    const result = await this.db.withRls(context, async (client) => {
      const roles = await client.query<RoleRow>(
        'SELECT id, org_id, name, is_system, created_at, updated_at FROM roles WHERE id = $1',
        [roleId],
      );
      if (!roles[0]) return null;

      await client.execute(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [roleId, dto.permissionId],
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
          operation: 'grant',
          permissionId: dto.permissionId,
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
