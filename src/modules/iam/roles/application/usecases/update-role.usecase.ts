import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { RoleEntity } from '../../domain/entities/role.entity';
import { UpdateRoleDto } from '../../presentation/dto/update-role.dto';

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
export class UpdateRoleUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, roleId: string, dto: UpdateRoleDto): Promise<RoleEntity> {
    const result = await this.db.withRls(context, async (client) => {
      const roles = await client.query<RoleRow>(
        `UPDATE roles SET name = $1 WHERE id = $2
         RETURNING id, org_id, name, is_system, created_at, updated_at`,
        [dto.name, roleId],
      );
      if (!roles[0]) return null;

      const perms = await client.query<PermissionRow>(
        'SELECT permission_id FROM role_permissions WHERE role_id = $1',
        [roleId],
      );

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
