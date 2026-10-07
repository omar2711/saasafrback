CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  name text NOT NULL,
  tax_id text,
  contact_name text,
  email text,
  phone text,
  address text,
  city text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  name text NOT NULL,
  tax_id text,
  email text,
  phone text,
  address text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (org_id, name)
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  sku text NOT NULL,
  name text NOT NULL,
  category text,
  description text,
  sale_price numeric(12, 2) NOT NULL DEFAULT 0,
  cost_price numeric(12, 2),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (org_id, sku)
);

CREATE TABLE IF NOT EXISTS inventory_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity_on_hand numeric(14, 2) NOT NULL DEFAULT 0,
  min_stock numeric(14, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, product_id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type text NOT NULL CHECK (movement_type IN (
    'purchase',
    'sale',
    'transfer_in',
    'transfer_out',
    'adjustment',
    'return'
  )),
  quantity numeric(14, 2) NOT NULL,
  unit_cost numeric(12, 2),
  total_cost numeric(12, 2),
  reference_type text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'received', 'canceled')),
  ordered_at timestamptz,
  received_at timestamptz,
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  discount_total numeric(12, 2) NOT NULL DEFAULT 0,
  tax_total numeric(12, 2) NOT NULL DEFAULT 0,
  total_cost numeric(12, 2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (org_id, order_number)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity numeric(14, 2) NOT NULL,
  unit_cost numeric(12, 2) NOT NULL,
  total_cost numeric(12, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (purchase_order_id, product_id)
);

CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  quote_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  valid_until date,
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  discount_total numeric(12, 2) NOT NULL DEFAULT 0,
  tax_total numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (org_id, quote_number)
);

CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity numeric(14, 2) NOT NULL,
  unit_price numeric(12, 2) NOT NULL,
  discount numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_id, product_id)
);

CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  sale_number text NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'voided', 'refunded')),
  sold_at timestamptz NOT NULL DEFAULT now(),
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  discount_total numeric(12, 2) NOT NULL DEFAULT 0,
  tax_total numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  cost_total numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (org_id, sale_number)
);

CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity numeric(14, 2) NOT NULL,
  unit_price numeric(12, 2) NOT NULL,
  unit_cost numeric(12, 2) NOT NULL DEFAULT 0,
  discount numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL,
  total_cost numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sale_id, product_id)
);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'voided')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  due_date date,
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  tax_total numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (org_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE RESTRICT,
  sale_id uuid NOT NULL REFERENCES sales(id) ON DELETE RESTRICT,
  amount numeric(12, 2) NOT NULL,
  method text NOT NULL CHECK (method IN ('cash', 'card', 'transfer', 'other')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'voided')),
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
