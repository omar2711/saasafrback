import { Module } from '@nestjs/common';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [PlansModule, SubscriptionsModule],
})
export class BillingModule {}
