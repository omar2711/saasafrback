import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';

interface FeatureRow {
  feature_code: string;
}

@Injectable()
export class CheckPlanFeatureUseCase {
  constructor(private readonly db: DbService) {}

  async assertHasFeature(context: RlsContext, featureCode: string): Promise<void> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const rows = await this.db.withRls(context, (client) =>
      client.query<FeatureRow>(
        `SELECT pf.code AS feature_code
         FROM subscriptions s
         JOIN plan_feature_limits pfl ON pfl.plan_id = s.plan_id
         JOIN plan_features pf ON pf.id = pfl.feature_id
         WHERE s.org_id = $1
           AND s.status = 'active'
           AND pf.code = $2
         LIMIT 1`,
        [orgId, featureCode],
      ),
    );

    if (rows.length === 0) {
      throw new ForbiddenException(
        `Tu plan actual no incluye acceso a este módulo (${featureCode}). Actualiza tu suscripción.`,
      );
    }
  }
}
