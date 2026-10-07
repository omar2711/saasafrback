import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { PettyCashTransactionEntity } from '../../domain/entities/petty-cash-transaction.entity';
import { CreatePettyCashTransactionDto } from '../../presentation/dto/create-petty-cash-transaction.dto';
import { CheckPlanFeatureUseCase } from './check-plan-feature.usecase';

interface TransactionRow {
  id: string;
  org_id: string;
  branch_id: string | null;
  type: string;
  amount: string;
  description: string;
  category: string;
  reference: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class CreatePettyCashTransactionUseCase {
  constructor(
    private readonly db: DbService,
    private readonly checkPlanFeature: CheckPlanFeatureUseCase,
  ) {}

  async execute(
    context: RlsContext,
    userId: string,
    dto: CreatePettyCashTransactionDto,
  ): Promise<PettyCashTransactionEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    await this.checkPlanFeature.assertHasFeature(context, 'module_petty_cash');

    const [row] = await this.db.withRls(context, (client) =>
      client.query<TransactionRow>(
        `INSERT INTO petty_cash_transactions
           (org_id, branch_id, type, amount, description, category, reference, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, org_id, branch_id, type, amount, description, category, reference, created_by, created_at, updated_at`,
        [
          orgId,
          dto.branchId ?? null,
          dto.type,
          dto.amount,
          dto.description,
          dto.category,
          dto.reference ?? null,
          userId,
        ],
      ),
    );

    return {
      id: row.id,
      orgId: row.org_id,
      branchId: row.branch_id,
      type: row.type as PettyCashTransactionEntity['type'],
      amount: toNumber(row.amount),
      description: row.description,
      category: row.category,
      reference: row.reference,
      createdBy: row.created_by,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }
}
