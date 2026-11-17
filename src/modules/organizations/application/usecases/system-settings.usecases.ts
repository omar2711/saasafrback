import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import { AuditService } from '../../../../common/audit/audit.service';
import { SetExchangeRateDto, UpdateSystemSettingsDto } from '../../presentation/dto/system-settings.dto';

export interface SystemSettingsRow {
  org_id: string;
  tax_name: string;
  tax_rate: string;
  base_currency: string;
  updated_at: Date;
}

export interface SystemSettingsEntity {
  orgId: string;
  taxName: string;
  taxRate: number;
  baseCurrency: string;
  updatedAt: string;
}

export interface ExchangeRateRow {
  id: string;
  base_currency: string;
  currency_code: string;
  rate: string;
  effective_date: string;
  updated_at: Date;
}

export interface ExchangeRateEntity {
  id: string;
  baseCurrency: string;
  currencyCode: string;
  rate: number;
  effectiveDate: string;
  updatedAt: string;
}

const DEFAULT_TAX_NAME = 'IVA';
const DEFAULT_TAX_RATE = 13;
const DEFAULT_CURRENCY = 'BOB';

function mapSettings(row: SystemSettingsRow): SystemSettingsEntity {
  return {
    orgId: row.org_id,
    taxName: row.tax_name,
    taxRate: Number(row.tax_rate),
    baseCurrency: row.base_currency,
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapRate(row: ExchangeRateRow): ExchangeRateEntity {
  return {
    id: row.id,
    baseCurrency: row.base_currency,
    currencyCode: row.currency_code,
    rate: Number(row.rate),
    effectiveDate: row.effective_date,
    updatedAt: row.updated_at.toISOString(),
  };
}

@Injectable()
export class GetSystemSettingsUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext): Promise<SystemSettingsEntity> {
    const orgId = context.orgId;
    if (!orgId) throw new ForbiddenException('Tenant context missing');

    const [row] = await this.db.withRls(context, (client) =>
      client.query<SystemSettingsRow>(
        `SELECT org_id, tax_name, tax_rate::text AS tax_rate, base_currency, updated_at
         FROM org_system_settings WHERE org_id = $1`,
        [orgId],
      ),
    );

    // Una empresa creada despues de la migracion todavia no tiene fila: se devuelven los valores de siempre.
    if (!row) {
      return {
        orgId,
        taxName: DEFAULT_TAX_NAME,
        taxRate: DEFAULT_TAX_RATE,
        baseCurrency: DEFAULT_CURRENCY,
        updatedAt: new Date().toISOString(),
      };
    }
    return mapSettings(row);
  }
}

@Injectable()
export class UpdateSystemSettingsUseCase {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async execute(context: RlsContext, dto: UpdateSystemSettingsDto): Promise<SystemSettingsEntity> {
    const orgId = context.orgId;
    if (!orgId) throw new ForbiddenException('Tenant context missing');

    const taxName = dto.taxName?.trim();
    if (dto.taxName !== undefined && !taxName) {
      throw new BadRequestException('El nombre del impuesto no puede estar vacio.');
    }

    const row = await this.db.withRls(context, async (client) => {
      const [saved] = await client.query<SystemSettingsRow>(
        `INSERT INTO org_system_settings (org_id, tax_name, tax_rate, base_currency)
         VALUES ($1::uuid, COALESCE($2::text, 'IVA'), COALESCE($3::numeric, 13), COALESCE($4::text, 'BOB'))
         ON CONFLICT (org_id) DO UPDATE SET
           tax_name = COALESCE($2::text, org_system_settings.tax_name),
           tax_rate = COALESCE($3::numeric, org_system_settings.tax_rate),
           base_currency = COALESCE($4::text, org_system_settings.base_currency),
           updated_at = now()
         RETURNING org_id, tax_name, tax_rate::text AS tax_rate, base_currency, updated_at`,
        [orgId, taxName ?? null, dto.taxRate ?? null, dto.baseCurrency ?? null],
      );

      await this.audit.recordInTransaction(client, context, {
        action: 'role.change',
        entityType: 'system_settings',
        entityId: orgId,
        metadata: {
          taxName: saved.tax_name,
          taxRate: Number(saved.tax_rate),
          baseCurrency: saved.base_currency,
        },
      });

      return saved;
    });

    return mapSettings(row);
  }
}

@Injectable()
export class ListExchangeRatesUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext): Promise<ExchangeRateEntity[]> {
    const orgId = context.orgId;
    if (!orgId) throw new ForbiddenException('Tenant context missing');

    const rows = await this.db.withRls(context, (client) =>
      client.query<ExchangeRateRow>(
        `SELECT id, base_currency, currency_code, rate::text AS rate,
                effective_date::text AS effective_date, updated_at
         FROM org_exchange_rates
         WHERE org_id = $1
         ORDER BY effective_date DESC, updated_at DESC
         LIMIT 200`,
        [orgId],
      ),
    );
    return rows.map(mapRate);
  }
}

@Injectable()
export class SetExchangeRateUseCase {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async execute(context: RlsContext, dto: SetExchangeRateDto): Promise<ExchangeRateEntity> {
    const orgId = context.orgId;
    if (!orgId) throw new ForbiddenException('Tenant context missing');

    const row = await this.db.withRls(context, async (client) => {
      const [settings] = await client.query<{ base_currency: string }>(
        `SELECT base_currency FROM org_system_settings WHERE org_id = $1`,
        [orgId],
      );
      const base = settings?.base_currency ?? DEFAULT_CURRENCY;

      if (dto.currencyCode === base) {
        throw new BadRequestException(
          'Esa es la moneda del sistema: no necesita tipo de cambio. Elige otra moneda.',
        );
      }

      // Sin fecha, el dia se calcula con la zona horaria de la empresa.
      const [saved] = await client.query<ExchangeRateRow>(
        `INSERT INTO org_exchange_rates (org_id, base_currency, currency_code, rate, effective_date)
         VALUES (
           $1::uuid, $2::text, $3::text, $4::numeric,
           COALESCE($5::date, (SELECT (now() AT TIME ZONE timezone)::date FROM orgs WHERE id = $1::uuid))
         )
         ON CONFLICT (org_id, base_currency, currency_code, effective_date)
         DO UPDATE SET rate = EXCLUDED.rate, updated_at = now()
         RETURNING id, base_currency, currency_code, rate::text AS rate,
                   effective_date::text AS effective_date, updated_at`,
        [orgId, base, dto.currencyCode, dto.rate, dto.effectiveDate ?? null],
      );

      await this.audit.recordInTransaction(client, context, {
        action: 'role.change',
        entityType: 'exchange_rate',
        entityId: saved.id,
        metadata: {
          baseCurrency: saved.base_currency,
          currencyCode: saved.currency_code,
          rate: Number(saved.rate),
          effectiveDate: saved.effective_date,
        },
      });

      return saved;
    });

    return mapRate(row);
  }
}