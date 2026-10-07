-- =============================================================================
-- 021: Devoluciones parciales de productos vendidos
--   sale_returns: cabecera de una devolucion contra una venta
--   sale_return_items: lineas devueltas (cantidad parcial por sale_item)
-- Reponen stock via movement_type='return', reference_type='sale_return'.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS sale_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  return_number text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'voided')),
  reason text,
  refund_total numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  UNIQUE (org_id, return_number)
);

CREATE TABLE IF NOT EXISTS sale_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  return_id uuid NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
  sale_item_id uuid NOT NULL REFERENCES sale_items(id) ON DELETE RESTRICT,
  quantity numeric(14, 2) NOT NULL CHECK (quantity > 0),
  unit_price numeric(12, 2) NOT NULL,
  refund_amount numeric(12, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (return_id, sale_item_id)
);

ALTER TABLE sale_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_return_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sale_returns_select ON sale_returns;
CREATE POLICY sale_returns_select ON sale_returns
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS sale_returns_insert ON sale_returns;
CREATE POLICY sale_returns_insert ON sale_returns
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS sale_returns_update ON sale_returns;
CREATE POLICY sale_returns_update ON sale_returns
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS sale_return_items_select ON sale_return_items;
CREATE POLICY sale_return_items_select ON sale_return_items
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS sale_return_items_insert ON sale_return_items;
CREATE POLICY sale_return_items_insert ON sale_return_items
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS sale_return_items_update ON sale_return_items;
CREATE POLICY sale_return_items_update ON sale_return_items
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

INSERT INTO permissions (code, description) VALUES
  ('sales.return', 'Registrar y anular devoluciones parciales de ventas')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.is_system = true AND r.name IN ('Gerente', 'Vendedor')
  AND p.code = 'sales.return'
ON CONFLICT DO NOTHING;

COMMIT;
