import { Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { PlanEntity } from '../../domain/entities/plan.entity';

interface PlanRow {
  id: string;
  code: string;
  name: string;
  price_monthly: string;
  price_yearly: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  currency: string;
  features: Record<string, number | null>;
}

@Injectable()
export class ListPlansUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext): Promise<PlanEntity[]> {
    const plans = await this.db.withRls(context, (client) =>
      client.query<PlanRow>(
        `SELECT p.*,COALESCE((SELECT jsonb_object_agg(f.code,l.limit_value) FROM plan_feature_limits l JOIN plan_features f ON f.id=l.feature_id WHERE l.plan_id=p.id),'{}'::jsonb) AS features FROM plans p WHERE p.deleted_at IS NULL ORDER BY p.created_at ASC`,
      ),
    );

    return plans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      priceMonthly: Number(plan.price_monthly),
      priceYearly: Number(plan.price_yearly),
      status: plan.status as PlanEntity['status'],
      createdAt: plan.created_at.toISOString(),
      updatedAt: plan.updated_at.toISOString(),
      currency: plan.currency,
      features: plan.features,
    }));
  }
}
