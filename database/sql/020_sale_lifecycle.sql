-- =============================================================================
-- 020: Ciclo de vida extendido de ventas
--   - voided_at: timestamp de anulacion (endpoint dedicado, ver Grupo B.2)
--   - delivered_at: timestamp de entrega de una venta adelantada
--   - status 'pending_delivery': venta adelantada con anticipo, sin stock
--     descontado aun (se difiere a la entrega)
--   - sale_items.purchase_order_id: reserva de la linea contra una orden de
--     compra abierta que ya esta reabasteciendo ese producto (ver Grupo B.3)
-- =============================================================================

BEGIN;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check;
ALTER TABLE sales ADD CONSTRAINT sales_status_check
  CHECK (status IN ('draft', 'completed', 'voided', 'refunded', 'pending_delivery'));

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS purchase_order_id uuid REFERENCES purchase_orders(id);

INSERT INTO permissions (code, description) VALUES
  ('sales.deliver', 'Entregar ventas adelantadas (descuenta stock diferido)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.is_system = true AND r.name IN ('Gerente', 'Administrador', 'Vendedor')
  AND p.code = 'sales.deliver'
ON CONFLICT DO NOTHING;

COMMIT;
