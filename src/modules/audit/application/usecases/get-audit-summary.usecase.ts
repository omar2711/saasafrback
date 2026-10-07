import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';

export interface AuditSummary {
  eventsToday: number;
  priceChanges: number;
  stockAdjustments: number;
  activeUsers: number;
}

interface SummaryRow {
  events_today: string;
  price_changes: string;
  stock_adjustments: string;
  active_users: string;
}

@Injectable()
export class GetAuditSummaryUseCase {
  constructor(private readonly db: DbService) {}

  /**
   * Las tarjetas de la pantalla de Auditoria. Iban con numeros inventados
   * (1.234 eventos, 45 cambios de precio) desde la plantilla v0.
   *
   * "Hoy" se calcula con la zona horaria de la organizacion, no la del servidor:
   * en La Paz la medianoche llega 4 horas despues que en UTC y el contador
   * saltaria a destiempo.
   */
  async execute(context: RlsContext): Promise<AuditSummary> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const [row] = await this.db.withRls(context, (client) =>
      client.query<SummaryRow>(
        `WITH bounds AS (
           SELECT date_trunc('day', now() AT TIME ZONE o.timezone) AT TIME ZONE o.timezone AS day_start
           FROM orgs o WHERE o.id = $1
         )
         SELECT
           COUNT(*) FILTER (WHERE a.created_at >= b.day_start) AS events_today,
           COUNT(*) FILTER (WHERE a.action = 'price.change' AND a.created_at >= b.day_start - interval '30 days') AS price_changes,
           COUNT(*) FILTER (WHERE a.action IN ('inventory.adjust', 'inventory.write_off') AND a.created_at >= b.day_start - interval '30 days') AS stock_adjustments,
           COUNT(DISTINCT a.user_id) FILTER (WHERE a.created_at >= b.day_start) AS active_users
         FROM audit_logs a
         CROSS JOIN bounds b
         WHERE a.org_id = $1`,
        [orgId],
      ),
    );

    return {
      eventsToday: Number(row?.events_today ?? 0),
      priceChanges: Number(row?.price_changes ?? 0),
      stockAdjustments: Number(row?.stock_adjustments ?? 0),
      activeUsers: Number(row?.active_users ?? 0),
    };
  }
}
