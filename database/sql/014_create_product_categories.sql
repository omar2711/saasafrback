-- =============================================================================
-- 014: Categorias de productos gestionables por organizacion
-- Crea una tabla propia de categorias y enlaza products.category_id.
-- Mantiene products.category (text) por compatibilidad con datos existentes.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (org_id, name)
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES product_categories(id);

-- Backfill: crear categorias a partir de los valores de texto existentes
INSERT INTO product_categories (org_id, name)
SELECT DISTINCT p.org_id, p.category
FROM products p
WHERE p.category IS NOT NULL
  AND btrim(p.category) <> ''
ON CONFLICT (org_id, name) DO NOTHING;

-- Enlazar productos a la categoria recien creada
UPDATE products p
SET category_id = pc.id
FROM product_categories pc
WHERE pc.org_id = p.org_id
  AND pc.name = p.category
  AND p.category_id IS NULL;

-- RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_categories_select ON product_categories;
CREATE POLICY product_categories_select ON product_categories
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS product_categories_insert ON product_categories;
CREATE POLICY product_categories_insert ON product_categories
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS product_categories_update ON product_categories;
CREATE POLICY product_categories_update ON product_categories
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

COMMIT;
