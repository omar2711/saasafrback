import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { PlanEntity } from '../../domain/entities/plan.entity';
import { UpdatePlanDto } from '../../presentation/dto/update-plan.dto';

interface PlanRow {
  id: string;
  code: string;
  name: string;
  price_monthly: string;
  price_yearly: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UpdatePlanUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, id: string, dto: UpdatePlanDto): Promise<PlanEntity> {
    const plans = await this.db.withRls(context, (client) =>
      client.query<PlanRow>(
        `UPDATE plans
         SET name = $1, price_monthly = $2, price_yearly = $3, status = $4
         WHERE id = $5
         RETURNING id, code, name, price_monthly, price_yearly, status, created_at, updated_at`,
        [dto.name, dto.priceMonthly, dto.priceYearly, dto.status, id],
      ),
    );

    if (!plans[0]) {
      throw new NotFoundException('Plan not found');
    }

    const plan = plans[0];
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      priceMonthly: Number(plan.price_monthly),
      priceYearly: Number(plan.price_yearly),
      status: plan.status as PlanEntity['status'],
      createdAt: plan.created_at.toISOString(),
      updatedAt: plan.updated_at.toISOString(),
    };
  }
}
