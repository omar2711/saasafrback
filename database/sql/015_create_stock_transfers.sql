-- =============================================================================
-- 015: Traspasos de stock entre sucursales (documento multi-producto)
-- Flujo: in_transit (sale del origen) -> completed (entra al destino)
--        o -> voided (se devuelve al origen). Solo se puede recibir/anular
--        mientras esta in_transit.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS stock_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  source_branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  dest_branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  transfer_number text NOT NULL,
  status text NOT NULL DEFAULT 'in_transit' CHECK (status IN ('in_transit', 'completed', 'voided')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  voided_at timestamptz,
  CHECK (source_branch_id <> dest_branch_id),
  UNIQUE (org_id, transfer_number)
);

CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  transfer_id uuid NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity numeric(14, 2) NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transfer_id, product_id)
);

-- RLS
ALTER TABLE stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfer_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stock_transfers_select ON stock_transfers;
CREATE POLICY stock_transfers_select ON stock_transfers
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS stock_transfers_insert ON stock_transfers;
CREATE POLICY stock_transfers_insert ON stock_transfers
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS stock_transfers_update ON stock_transfers;
CREATE POLICY stock_transfers_update ON stock_transfers
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS stock_transfer_items_select ON stock_transfer_items;
CREATE POLICY stock_transfer_items_select ON stock_transfer_items
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS stock_transfer_items_insert ON stock_transfer_items;
CREATE POLICY stock_transfer_items_insert ON stock_transfer_items
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS stock_transfer_items_update ON stock_transfer_items;
CREATE POLICY stock_transfer_items_update ON stock_transfer_items
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

COMMIT;
