import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { CreateUserUseCase } from './application/usecases/create-user.usecase';
import { GetUserUseCase } from './application/usecases/get-user.usecase';
import { ListUsersUseCase } from './application/usecases/list-users.usecase';
import { SetUserStatusUseCase } from './application/usecases/set-user-status.usecase';
import { UpdateUserUseCase } from './application/usecases/update-user.usecase';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [UsersController],
  providers: [
    CreateUserUseCase,
    ListUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    SetUserStatusUseCase,
  ],
})
export class UsersModule {}
