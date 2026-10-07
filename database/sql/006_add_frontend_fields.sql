-- Migration 006: Add fields required by frontend integration
-- Suppliers: add company, location (replaces city), notes
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS notes text;

-- Products: add unit and image_url
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit text DEFAULT 'unidad';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;

-- Purchase orders: expand status to include pending/approved workflow stages
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_status_check;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN ('draft', 'pending', 'ordered', 'approved', 'received', 'canceled'));

-- Quotes: add inline client fields (used when no customer record exists)
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_phone text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_company text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_nit text;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS client_address text;

-- Quotes: expand status to match frontend workflow
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_status_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_status_check
  CHECK (status IN ('pending', 'sent', 'approved', 'accepted', 'rejected', 'expired', 'converted'));

-- Sales: add inline client name and payment method shortcut
ALTER TABLE sales ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE sales ADD CONSTRAINT sales_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('cash', 'card', 'transfer', 'credit', 'other'));
