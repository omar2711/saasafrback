import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { PettyCashTransactionEntity, PettyCashSummaryEntity } from '../../domain/entities/petty-cash-transaction.entity';
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

export interface ListPettyCashFilter {
  branchId?: string;
  type?: string;
  category?: string;
}

export interface PettyCashListResult {
  transactions: PettyCashTransactionEntity[];
  summary: PettyCashSummaryEntity;
}

@Injectable()
export class ListPettyCashTransactionsUseCase {
  constructor(
    private readonly db: DbService,
    private readonly checkPlanFeature: CheckPlanFeatureUseCase,
  ) {}

  async execute(context: RlsContext, filter: ListPettyCashFilter = {}): Promise<PettyCashListResult> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    await this.checkPlanFeature.assertHasFeature(context, 'module_petty_cash');

    const conditions: string[] = ['org_id = $1', 'deleted_at IS NULL'];
    const params: unknown[] = [orgId];

    if (filter.branchId) {
      params.push(filter.branchId);
      conditions.push(`branch_id = $${params.length}`);
    }
    if (filter.type) {
      params.push(filter.type);
      conditions.push(`type = $${params.length}`);
    }
    if (filter.category) {
      params.push(filter.category);
      conditions.push(`category = $${params.length}`);
    }

    const rows = await this.db.withRls(context, (client) =>
      client.query<TransactionRow>(
        `SELECT id, org_id, branch_id, type, amount, description, category, reference, created_by, created_at, updated_at
         FROM petty_cash_transactions
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC`,
        params,
      ),
    );

    const transactions = rows.map((r) => this.toEntity(r));

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      transactions,
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      },
    };
  }

  private toEntity(r: TransactionRow): PettyCashTransactionEntity {
    return {
      id: r.id,
      orgId: r.org_id,
      branchId: r.branch_id,
      type: r.type as PettyCashTransactionEntity['type'],
      amount: toNumber(r.amount),
      description: r.description,
      category: r.category,
      reference: r.reference,
      createdBy: r.created_by,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString(),
    };
  }
}
