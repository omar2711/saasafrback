import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { SubscriptionEntity } from '../../domain/entities/subscription.entity';
import { UpdateSubscriptionDto } from '../../presentation/dto/update-subscription.dto';

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
export class UpdateSubscriptionUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, dto: UpdateSubscriptionDto): Promise<SubscriptionEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const subscriptions = await this.db.withRls(context, (client) =>
      client.query<SubscriptionRow>(
        `UPDATE subscriptions SET plan_id = $1, renewal_period = $2
         WHERE org_id = $3
         RETURNING id, org_id, plan_id, status, start_date, end_date, grace_days, renewal_period, created_at, updated_at`,
        [dto.planId, dto.renewalPeriod, orgId],
      ),
    );

    if (!subscriptions[0]) {
      throw new NotFoundException('Subscription not found');
    }

    const s = subscriptions[0];
    return {
      id: s.id,
      orgId: s.org_id,
      planId: s.plan_id,
      status: s.status as SubscriptionEntity['status'],
      startDate: s.start_date.toISOString(),
      endDate: s.end_date ? s.end_date.toISOString() : null,
      graceDays: s.grace_days,
      renewalPeriod: s.renewal_period as SubscriptionEntity['renewalPeriod'],
      createdAt: s.created_at.toISOString(),
      updatedAt: s.updated_at.toISOString(),
    };
  }
}
