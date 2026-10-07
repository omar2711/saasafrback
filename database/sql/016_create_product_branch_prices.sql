-- =============================================================================
-- 016: Precios por sucursal (override del precio global del producto)
-- El precio efectivo en ventas/cotizaciones = override de sucursal si existe,
-- de lo contrario el precio global de products.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS product_branch_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sale_price numeric(12, 2),
  cost_price numeric(12, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, product_id)
);

-- RLS
ALTER TABLE product_branch_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_branch_prices_select ON product_branch_prices;
CREATE POLICY product_branch_prices_select ON product_branch_prices
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS product_branch_prices_insert ON product_branch_prices;
CREATE POLICY product_branch_prices_insert ON product_branch_prices
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS product_branch_prices_update ON product_branch_prices;
CREATE POLICY product_branch_prices_update ON product_branch_prices
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

COMMIT;
