-- =============================================================================
-- 024: Datos de cliente y vendedor en la venta
-- Espeja los campos inline que quotes ya tiene desde 006_add_frontend_fields,
-- para poder emitir el comprobante a nombre de un cliente ocasional del POS.
-- sold_by permite reimprimir el recibo desde el historial con el cajero real.
-- =============================================================================

BEGIN;

ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_nit text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_phone text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_address text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS sold_by uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sales_org_customer_idx
  ON sales (org_id, customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS quotes_org_customer_idx
  ON quotes (org_id, customer_id) WHERE deleted_at IS NULL;

COMMIT;
