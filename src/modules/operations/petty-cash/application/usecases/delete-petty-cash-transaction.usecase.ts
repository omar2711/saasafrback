import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { CheckPlanFeatureUseCase } from './check-plan-feature.usecase';

interface ExistsRow { id: string }

@Injectable()
export class DeletePettyCashTransactionUseCase {
  constructor(
    private readonly db: DbService,
    private readonly checkPlanFeature: CheckPlanFeatureUseCase,
  ) {}

  async execute(context: RlsContext, id: string): Promise<void> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    await this.checkPlanFeature.assertHasFeature(context, 'module_petty_cash');

    const rows = await this.db.withRls(context, (client) =>
      client.query<ExistsRow>(
        `SELECT id FROM petty_cash_transactions WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
        [id, orgId],
      ),
    );

    if (rows.length === 0) {
      throw new NotFoundException('Transacción no encontrada');
    }

    await this.db.withRls(context, (client) =>
      client.execute(
        `UPDATE petty_cash_transactions SET deleted_at = now() WHERE id = $1`,
        [id],
      ),
    );
  }
}
