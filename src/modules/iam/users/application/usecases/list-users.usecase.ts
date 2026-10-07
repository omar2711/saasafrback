import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { UserEntity } from '../../domain/entities/user.entity';
import { mapUser, UserRow } from '../user.mapper';

@Injectable()
export class ListUsersUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext): Promise<UserEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const users = await this.db.withRls(context, (client) =>
      client.query<UserRow>(
        `SELECT DISTINCT u.id, u.email, u.full_name, u.phone, u.status, u.created_at, u.updated_at, u.deleted_at
         FROM users u
         JOIN org_members om ON om.user_id = u.id
         WHERE om.org_id = $1 AND om.deleted_at IS NULL
         ORDER BY u.created_at DESC`,
        [orgId],
      ),
    );

    return users.map(mapUser);
  }
}
