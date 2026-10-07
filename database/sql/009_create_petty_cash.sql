-- =============================================================================
-- 009: Caja Chica (Petty Cash)
-- Solo disponible en Plan 3 – Empresarial (enterprise)
-- =============================================================================

-- Tabla principal
CREATE TABLE IF NOT EXISTS petty_cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  branch_id uuid REFERENCES branches(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  category text NOT NULL,
  reference text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- RLS
ALTER TABLE petty_cash_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS petty_cash_transactions_select ON petty_cash_transactions;
CREATE POLICY petty_cash_transactions_select ON petty_cash_transactions
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS petty_cash_transactions_insert ON petty_cash_transactions;
CREATE POLICY petty_cash_transactions_insert ON petty_cash_transactions
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS petty_cash_transactions_update ON petty_cash_transactions;
CREATE POLICY petty_cash_transactions_update ON petty_cash_transactions
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

-- Plan feature: caja chica solo en enterprise
INSERT INTO plan_features (code, description)
VALUES ('module_petty_cash', 'Módulo de caja chica (ingresos y egresos menores)')
ON CONFLICT (code) DO NOTHING;
