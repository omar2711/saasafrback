import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { CancelSubscriptionUseCase } from './application/usecases/cancel-subscription.usecase';
import { CreateSubscriptionUseCase } from './application/usecases/create-subscription.usecase';
import { GetCurrentSubscriptionUseCase } from './application/usecases/get-current-subscription.usecase';
import { UpdateSubscriptionUseCase } from './application/usecases/update-subscription.usecase';
import { SubscriptionsController } from './presentation/subscriptions.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [SubscriptionsController],
  providers: [
    CancelSubscriptionUseCase,
    CreateSubscriptionUseCase,
    GetCurrentSubscriptionUseCase,
    UpdateSubscriptionUseCase,
  ],
})
export class SubscriptionsModule {}
