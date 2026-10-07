import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { UserEntity } from '../../domain/entities/user.entity';
import { UpdateUserDto } from '../../presentation/dto/update-user.dto';
import { mapUser, UserRow } from '../user.mapper';

@Injectable()
export class UpdateUserUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const users = await this.db.withRls(context, (client) =>
      client.query<UserRow>(
        `UPDATE users
         SET full_name = $1, phone = COALESCE($2::text, phone)
         WHERE id = $3
         RETURNING id, email, full_name, phone, status, created_at, updated_at, deleted_at`,
        [dto.fullName, dto.phone ?? null, id],
      ),
    );

    if (!users[0]) {
      throw new NotFoundException('User not found');
    }

    return mapUser(users[0]);
  }
}
