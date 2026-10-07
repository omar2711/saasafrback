-- =============================================================================
-- 019: Kits de productos (combos vendidos como una sola linea, a precio
-- inferior a la suma de sus componentes). Al vender un kit, se descuenta
-- el stock de cada producto componente (ver sale-stock-helpers.ts).
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  sale_price numeric(12, 2) NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (org_id, sku)
);

CREATE TABLE IF NOT EXISTS kit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  kit_id uuid NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity numeric(14, 2) NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kit_id, product_id)
);

ALTER TABLE kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kit_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kits_select ON kits;
CREATE POLICY kits_select ON kits
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS kits_insert ON kits;
CREATE POLICY kits_insert ON kits
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS kits_update ON kits;
CREATE POLICY kits_update ON kits
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS kit_items_select ON kit_items;
CREATE POLICY kit_items_select ON kit_items
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS kit_items_insert ON kit_items;
CREATE POLICY kit_items_insert ON kit_items
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS kit_items_update ON kit_items;
CREATE POLICY kit_items_update ON kit_items
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

-- Lineas de venta/cotizacion pueden referenciar un producto O un kit (exactamente uno)
ALTER TABLE sale_items ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS kit_id uuid REFERENCES kits(id) ON DELETE RESTRICT;
ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_product_xor_kit;
ALTER TABLE sale_items ADD CONSTRAINT sale_items_product_xor_kit
  CHECK ((product_id IS NOT NULL) <> (kit_id IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS sale_items_sale_kit_uidx
  ON sale_items (sale_id, kit_id) WHERE kit_id IS NOT NULL;

ALTER TABLE quote_items ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE quote_items ADD COLUMN IF NOT EXISTS kit_id uuid REFERENCES kits(id) ON DELETE RESTRICT;
ALTER TABLE quote_items DROP CONSTRAINT IF EXISTS quote_items_product_xor_kit;
ALTER TABLE quote_items ADD CONSTRAINT quote_items_product_xor_kit
  CHECK ((product_id IS NOT NULL) <> (kit_id IS NOT NULL));
CREATE UNIQUE INDEX IF NOT EXISTS quote_items_quote_kit_uidx
  ON quote_items (quote_id, kit_id) WHERE kit_id IS NOT NULL;

INSERT INTO permissions (code, description) VALUES
  ('kits.write', 'Crear/editar/eliminar kits (combos de productos)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.is_system = true AND r.name IN ('Gerente', 'Administrador')
  AND p.code = 'kits.write'
ON CONFLICT DO NOTHING;

COMMIT;
