-- =============================================================================
-- 028: Rango de precio de venta
--
-- Agujero que cierra: create-sale.usecase.ts hacia
--   item.unitPrice ?? effective?.salePrice
-- es decir aceptaba **cualquier** precio que mandara el cliente, sin validarlo.
-- Un vendedor podia vender con un curl una laptop de 5000 Bs en 1 Bs. La UI no
-- ofrecia el campo, pero la API si.
--
-- El rango se define en products (global) **y** en product_branch_prices. Si
-- fuera solo global, una sucursal con override fuera del rango global se
-- quedaria con el catalogo invendible: el precio efectivo de esa sucursal
-- caeria fuera de su propio limite.
--
-- Regla de resolucion (la misma que ya usa el precio efectivo):
--   limite de la sucursal si existe, si no el global, si no sin limite.
-- =============================================================================

BEGIN;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS min_sale_price numeric(12, 2),
  ADD COLUMN IF NOT EXISTS max_sale_price numeric(12, 2);

ALTER TABLE product_branch_prices
  ADD COLUMN IF NOT EXISTS min_sale_price numeric(12, 2),
  ADD COLUMN IF NOT EXISTS max_sale_price numeric(12, 2);

-- Coherencia del rango. Se comprueba en la BD y no solo en el DTO porque el
-- precio efectivo se calcula en SQL y un rango invertido dejaria el producto
-- invendible sin ningun mensaje.
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sale_price_range_check;
ALTER TABLE products ADD CONSTRAINT products_sale_price_range_check
  CHECK (
    min_sale_price IS NULL OR max_sale_price IS NULL OR min_sale_price <= max_sale_price
  );

ALTER TABLE product_branch_prices DROP CONSTRAINT IF EXISTS pbp_sale_price_range_check;
ALTER TABLE product_branch_prices ADD CONSTRAINT pbp_sale_price_range_check
  CHECK (
    min_sale_price IS NULL OR max_sale_price IS NULL OR min_sale_price <= max_sale_price
  );

-- ---------------------------------------------------------------------------
-- Permiso de excepcion. Solo el Gerente puede salirse del rango; queda fuera
-- del Administrador a proposito, igual que sales.void.
-- ---------------------------------------------------------------------------
INSERT INTO permissions (code, description) VALUES
  ('sales.price_override', 'Vender fuera del rango de precio autorizado')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.is_system = true AND r.name = 'Gerente'
  AND p.code = 'sales.price_override'
ON CONFLICT DO NOTHING;

COMMIT;
