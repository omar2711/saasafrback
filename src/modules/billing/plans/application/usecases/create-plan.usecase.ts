import { Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { PlanEntity } from '../../domain/entities/plan.entity';
import { CreatePlanDto } from '../../presentation/dto/create-plan.dto';

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
export class CreatePlanUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, dto: CreatePlanDto): Promise<PlanEntity> {
    const [plan] = await this.db.withRls(context, (client) =>
      client.query<PlanRow>(
        `INSERT INTO plans (code, name, price_monthly, price_yearly, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id, code, name, price_monthly, price_yearly, status, created_at, updated_at`,
        [dto.code, dto.name, dto.priceMonthly, dto.priceYearly],
      ),
    );

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
