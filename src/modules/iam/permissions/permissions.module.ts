import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { ListPermissionsUseCase } from './application/usecases/list-permissions.usecase';
import { PermissionsController } from './presentation/permissions.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [PermissionsController],
  providers: [ListPermissionsUseCase],
})
export class PermissionsModule {}
