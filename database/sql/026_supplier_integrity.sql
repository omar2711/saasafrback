-- =============================================================================
-- 026: Integridad de proveedores
--
-- Bug que cierra: suppliers tiene UNIQUE (org_id, name) NO parcial, asi que un
-- proveedor borrado con soft delete (invisible en la lista) bloquea su nombre
-- para siempre. El usuario intenta volver a crearlo, choca contra el 23505 y ve
-- "Internal server error" porque nadie captura el error.
--
-- Se cambia por:
--   - unico parcial sobre lower(btrim(name)) WHERE deleted_at IS NULL, de modo
--     que "  ACME  " y "acme" colisionan pero un proveedor eliminado libera su
--     nombre.
--   - unico parcial de NIT por organizacion, como el de clientes en 022.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Normalizacion previa. Debe coincidir con supplier-helpers.ts o el indice no
-- atrapa los duplicados que el codigo cree estar evitando.
-- ---------------------------------------------------------------------------
UPDATE suppliers
SET name = btrim(name)
WHERE name IS DISTINCT FROM btrim(name);

UPDATE suppliers
SET tax_id = NULLIF(upper(btrim(tax_id)), '')
WHERE tax_id IS DISTINCT FROM NULLIF(upper(btrim(tax_id)), '');

-- Un nombre vacio tras el recorte no puede quedarse: violaria el NOT NULL de
-- facto que espera la UI y ademas colisionaria con cualquier otro vacio.
UPDATE suppliers
SET name = 'Proveedor sin nombre ' || left(id::text, 8)
WHERE btrim(name) = '';

-- ---------------------------------------------------------------------------
-- Pre-flight de deduplicacion. Sin esto el CREATE UNIQUE INDEX aborta y TODA la
-- migracion hace ROLLBACK (patron de 022_customers_integrity.sql).
-- Se conserva el registro mas antiguo intacto; a los demas se les agrega un
-- sufijo visible para que el operador los corrija desde la pantalla Proveedores.
-- ---------------------------------------------------------------------------
WITH dups AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY org_id, lower(btrim(name)) ORDER BY created_at, id
         ) AS rn
  FROM suppliers
  WHERE deleted_at IS NULL
)
UPDATE suppliers s
SET name = s.name || ' (DUP' || d.rn || ')'
FROM dups d
WHERE d.id = s.id AND d.rn > 1;

WITH dups AS (
  SELECT id,
         row_number() OVER (PARTITION BY org_id, tax_id ORDER BY created_at, id) AS rn
  FROM suppliers
  WHERE deleted_at IS NULL AND tax_id IS NOT NULL
)
UPDATE suppliers s
SET tax_id = s.tax_id || '-DUP' || d.rn
FROM dups d
WHERE d.id = s.id AND d.rn > 1;

-- ---------------------------------------------------------------------------
-- Indices
-- ---------------------------------------------------------------------------
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_org_id_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_org_name_unique
  ON suppliers (org_id, lower(btrim(name)))
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_org_tax_id_unique
  ON suppliers (org_id, tax_id)
  WHERE deleted_at IS NULL AND tax_id IS NOT NULL;

COMMIT;
