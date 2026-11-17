-- Configuracion del sistema (impuesto y moneda) y tipo de cambio por dia.
BEGIN;

SELECT app.set_context(NULL, NULL, NULL, true);

CREATE TABLE IF NOT EXISTS org_system_settings (
  org_id uuid PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  tax_name text NOT NULL DEFAULT 'IVA',
  tax_rate numeric(5,2) NOT NULL DEFAULT 13,
  base_currency text NOT NULL DEFAULT 'BOB',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_system_settings_tax_rate_check CHECK (tax_rate >= 0 AND tax_rate <= 100),
  CONSTRAINT org_system_settings_tax_name_check CHECK (length(btrim(tax_name)) > 0),
  CONSTRAINT org_system_settings_currency_check CHECK (base_currency ~ '^[A-Z]{3}$')
);

-- Las empresas existentes arrancan con lo que hoy esta fijo en el sistema: IVA 13% en BOB.
INSERT INTO org_system_settings (org_id)
SELECT id FROM orgs
ON CONFLICT (org_id) DO NOTHING;

ALTER TABLE org_system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_system_settings_select ON org_system_settings;
CREATE POLICY org_system_settings_select ON org_system_settings
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS org_system_settings_insert ON org_system_settings;
CREATE POLICY org_system_settings_insert ON org_system_settings
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS org_system_settings_update ON org_system_settings;
CREATE POLICY org_system_settings_update ON org_system_settings
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

-- Tipo de cambio: 1 unidad de currency_code = rate unidades de base_currency.
CREATE TABLE IF NOT EXISTS org_exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  base_currency text NOT NULL,
  currency_code text NOT NULL,
  rate numeric(18,6) NOT NULL,
  effective_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_exchange_rates_rate_check CHECK (rate > 0),
  CONSTRAINT org_exchange_rates_base_check CHECK (base_currency ~ '^[A-Z]{3}$'),
  CONSTRAINT org_exchange_rates_code_check CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT org_exchange_rates_diff_check CHECK (currency_code <> base_currency),
  CONSTRAINT org_exchange_rates_unique UNIQUE (org_id, base_currency, currency_code, effective_date)
);

CREATE INDEX IF NOT EXISTS org_exchange_rates_org_date_idx
  ON org_exchange_rates (org_id, effective_date DESC);

ALTER TABLE org_exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_exchange_rates_select ON org_exchange_rates;
CREATE POLICY org_exchange_rates_select ON org_exchange_rates
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS org_exchange_rates_insert ON org_exchange_rates;
CREATE POLICY org_exchange_rates_insert ON org_exchange_rates
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS org_exchange_rates_update ON org_exchange_rates;
CREATE POLICY org_exchange_rates_update ON org_exchange_rates
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

COMMIT;