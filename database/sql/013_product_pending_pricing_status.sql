-- =============================================================================
-- 013: Estado 'pending_pricing' para productos
-- Permite crear productos desde una orden de compra sin precio de venta
-- definido, quedando marcados para revisión de precios.
-- =============================================================================

BEGIN;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;

ALTER TABLE products
  ADD CONSTRAINT products_status_check
  CHECK (status IN ('active', 'inactive', 'pending_pricing'));

COMMIT;
