import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { DatabaseModule } from '../../database/database.module';
import { CreateBranchUseCase } from './application/usecases/create-branch.usecase';
import { CreateOrganizationUseCase } from './application/usecases/create-organization.usecase';
import { GetMyBranchUseCase } from './application/usecases/get-my-branch.usecase';
import { GetOrganizationUseCase } from './application/usecases/get-organization.usecase';
import { ListBranchesUseCase } from './application/usecases/list-branches.usecase';
import { ListOrganizationsUseCase } from './application/usecases/list-organizations.usecase';
import { UpdateBranchUseCase } from './application/usecases/update-branch.usecase';
import { UpdateOrganizationUseCase } from './application/usecases/update-organization.usecase';
import { GetWorkScheduleUseCase } from './application/usecases/get-work-schedule.usecase';
import { UpdateWorkScheduleUseCase } from './application/usecases/update-work-schedule.usecase';
import { BranchesController } from './presentation/branches.controller';
import { OrganizationsController } from './presentation/organizations.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [BranchesController, OrganizationsController],
  providers: [
    CreateOrganizationUseCase,
    ListOrganizationsUseCase,
    GetOrganizationUseCase,
    UpdateOrganizationUseCase,
    CreateBranchUseCase,
    ListBranchesUseCase,
    UpdateBranchUseCase,
    GetMyBranchUseCase,
    GetWorkScheduleUseCase,
    UpdateWorkScheduleUseCase,
  ],
})
export class OrganizationsModule {}
