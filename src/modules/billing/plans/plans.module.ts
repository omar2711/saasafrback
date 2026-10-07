import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { CreatePlanUseCase } from './application/usecases/create-plan.usecase';
import { ListPlansUseCase } from './application/usecases/list-plans.usecase';
import { UpdatePlanUseCase } from './application/usecases/update-plan.usecase';
import { PlansController } from './presentation/plans.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [PlansController],
  providers: [CreatePlanUseCase, ListPlansUseCase, UpdatePlanUseCase],
})
export class PlansModule {}
