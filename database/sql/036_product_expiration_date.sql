-- 036: Fecha de vencimiento opcional por producto
BEGIN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiration_date date;
COMMIT;