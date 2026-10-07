import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { RoleEntity } from '../../domain/entities/role.entity';
import { CreateRoleDto } from '../../presentation/dto/create-role.dto';

interface RoleRow {
  id: string;
  org_id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class CreateRoleUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, dto: CreateRoleDto): Promise<RoleEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const [role] = await this.db.withRls(context, (client) =>
      client.query<RoleRow>(
        `INSERT INTO roles (org_id, name) VALUES ($1, $2)
         RETURNING id, org_id, name, created_at, updated_at`,
        [orgId, dto.name],
      ),
    );

    return {
      id: role.id,
      orgId: role.org_id,
      name: role.name,
      isSystem: false,
      permissions: [],
      createdAt: role.created_at.toISOString(),
      updatedAt: role.updated_at.toISOString(),
    };
  }
}
