import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { UserEntity } from '../../domain/entities/user.entity';
import { mapUser, UserRow } from '../user.mapper';

@Injectable()
export class GetUserUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, id: string): Promise<UserEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const users = await this.db.withRls(context, (client) =>
      client.query<UserRow>(
        `SELECT u.id, u.email, u.full_name, u.phone, u.status, u.created_at, u.updated_at, u.deleted_at
         FROM users u
         JOIN org_members om ON om.user_id = u.id
         WHERE u.id = $1 AND om.org_id = $2 AND om.deleted_at IS NULL
         LIMIT 1`,
        [id, orgId],
      ),
    );

    if (!users[0]) {
      throw new NotFoundException('User not found');
    }

    return mapUser(users[0]);
  }
}
