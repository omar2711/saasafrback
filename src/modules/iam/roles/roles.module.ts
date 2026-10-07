import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { AssignRolePermissionUseCase } from './application/usecases/assign-role-permission.usecase';
import { CreateRoleUseCase } from './application/usecases/create-role.usecase';
import { DeleteRoleUseCase } from './application/usecases/delete-role.usecase';
import { ListRolesUseCase } from './application/usecases/list-roles.usecase';
import { RemoveRolePermissionUseCase } from './application/usecases/remove-role-permission.usecase';
import { UpdateRoleUseCase } from './application/usecases/update-role.usecase';
import { RolesController } from './presentation/roles.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [RolesController],
  providers: [
    CreateRoleUseCase,
    ListRolesUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    AssignRolePermissionUseCase,
    RemoveRolePermissionUseCase,
  ],
})
export class RolesModule {}
