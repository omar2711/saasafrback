import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { SubscriptionEntity } from '../../domain/entities/subscription.entity';
import { CreateSubscriptionDto } from '../../presentation/dto/create-subscription.dto';

interface SubscriptionRow {
  id: string;
  org_id: string;
  plan_id: string;
  status: string;
  start_date: Date;
  end_date: Date | null;
  grace_days: number;
  renewal_period: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class CreateSubscriptionUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, dto: CreateSubscriptionDto): Promise<SubscriptionEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const [subscription] = await this.db.withRls(context, (client) =>
      client.query<SubscriptionRow>(
        `INSERT INTO subscriptions (org_id, plan_id, start_date, renewal_period, grace_days, status)
         VALUES ($1, $2, $3, $4, 3, 'active')
         RETURNING id, org_id, plan_id, status, start_date, end_date, grace_days, renewal_period, created_at, updated_at`,
        [orgId, dto.planId, new Date(dto.startDate), dto.renewalPeriod],
      ),
    );

    return {
      id: subscription.id,
      orgId: subscription.org_id,
      planId: subscription.plan_id,
      status: subscription.status as SubscriptionEntity['status'],
      startDate: subscription.start_date.toISOString(),
      endDate: subscription.end_date ? subscription.end_date.toISOString() : null,
      graceDays: subscription.grace_days,
      renewalPeriod: subscription.renewal_period as SubscriptionEntity['renewalPeriod'],
      createdAt: subscription.created_at.toISOString(),
      updatedAt: subscription.updated_at.toISOString(),
    };
  }
}
