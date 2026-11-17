-- Fecha de vencimiento por item de orden de compra
ALTER TABLE purchase_order_items ADD COLUMN IF NOT EXISTS expiration_date date;
