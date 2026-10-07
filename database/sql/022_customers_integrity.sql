-- =============================================================================
-- 022: Integridad de clientes
--   - city: columna que el codigo ya lee/escribe pero que nunca se creo, por lo
--     que GET/POST/PATCH /operations/customers fallaban con 42703.
--   - tax_id (CI/NIT) unico por organizacion entre clientes vivos.
--   - se libera el nombre: dos clientes pueden llamarse igual con CI distinto.
-- =============================================================================

BEGIN;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS city text;

-- Normalizacion previa: recorte + mayusculas, vacio -> NULL.
UPDATE customers
SET tax_id = NULLIF(upper(btrim(tax_id)), '')
WHERE tax_id IS DISTINCT FROM NULLIF(upper(btrim(tax_id)), '');

-- Resolucion de duplicados PREEXISTENTES. Sin esto el CREATE UNIQUE INDEX
-- aborta y toda la migracion hace ROLLBACK, incluido el ADD COLUMN city.
-- Se conserva el registro mas antiguo intacto y a los demas se les agrega un
-- sufijo visible para que el operador los corrija desde la pantalla Clientes.
WITH dups AS (
  SELECT id,
         row_number() OVER (PARTITION BY org_id, tax_id ORDER BY created_at, id) AS rn
  FROM customers
  WHERE deleted_at IS NULL AND tax_id IS NOT NULL
)
UPDATE customers c
SET tax_id = c.tax_id || '-DUP' || d.rn
FROM dups d
WHERE d.id = c.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS customers_org_tax_id_unique
  ON customers (org_id, tax_id)
  WHERE deleted_at IS NULL AND tax_id IS NOT NULL;

-- Dos clientes pueden llamarse igual si tienen CI/NIT distinto.
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_org_id_name_key;
CREATE INDEX IF NOT EXISTS customers_org_name_idx ON customers (org_id, lower(name));

INSERT INTO permissions (code, description) VALUES
  ('customers.delete', 'Eliminar clientes')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.is_system = true AND r.name IN ('Gerente', 'Administrador')
  AND p.code = 'customers.delete'
ON CONFLICT DO NOTHING;

COMMIT;
