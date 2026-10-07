ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS suppliers_select ON suppliers;
CREATE POLICY suppliers_select ON suppliers
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS suppliers_insert ON suppliers;
CREATE POLICY suppliers_insert ON suppliers
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS suppliers_update ON suppliers;
CREATE POLICY suppliers_update ON suppliers
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS customers_select ON customers;
CREATE POLICY customers_select ON customers
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS customers_insert ON customers;
CREATE POLICY customers_insert ON customers
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS customers_update ON customers;
CREATE POLICY customers_update ON customers
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS products_select ON products;
CREATE POLICY products_select ON products
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS products_insert ON products;
CREATE POLICY products_insert ON products
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS products_update ON products;
CREATE POLICY products_update ON products
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS inventory_stock_select ON inventory_stock;
CREATE POLICY inventory_stock_select ON inventory_stock
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS inventory_stock_insert ON inventory_stock;
CREATE POLICY inventory_stock_insert ON inventory_stock
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS inventory_stock_update ON inventory_stock;
CREATE POLICY inventory_stock_update ON inventory_stock
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS inventory_movements_select ON inventory_movements;
CREATE POLICY inventory_movements_select ON inventory_movements
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS inventory_movements_insert ON inventory_movements;
CREATE POLICY inventory_movements_insert ON inventory_movements
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS inventory_movements_update ON inventory_movements;
CREATE POLICY inventory_movements_update ON inventory_movements
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS purchase_orders_select ON purchase_orders;
CREATE POLICY purchase_orders_select ON purchase_orders
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS purchase_orders_insert ON purchase_orders;
CREATE POLICY purchase_orders_insert ON purchase_orders
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS purchase_orders_update ON purchase_orders;
CREATE POLICY purchase_orders_update ON purchase_orders
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS purchase_order_items_select ON purchase_order_items;
CREATE POLICY purchase_order_items_select ON purchase_order_items
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS purchase_order_items_insert ON purchase_order_items;
CREATE POLICY purchase_order_items_insert ON purchase_order_items
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS purchase_order_items_update ON purchase_order_items;
CREATE POLICY purchase_order_items_update ON purchase_order_items
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS quotes_select ON quotes;
CREATE POLICY quotes_select ON quotes
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS quotes_insert ON quotes;
CREATE POLICY quotes_insert ON quotes
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS quotes_update ON quotes;
CREATE POLICY quotes_update ON quotes
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS quote_items_select ON quote_items;
CREATE POLICY quote_items_select ON quote_items
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS quote_items_insert ON quote_items;
CREATE POLICY quote_items_insert ON quote_items
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS quote_items_update ON quote_items;
CREATE POLICY quote_items_update ON quote_items
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS sales_select ON sales;
CREATE POLICY sales_select ON sales
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS sales_insert ON sales;
CREATE POLICY sales_insert ON sales
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS sales_update ON sales;
CREATE POLICY sales_update ON sales
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS sale_items_select ON sale_items;
CREATE POLICY sale_items_select ON sale_items
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS sale_items_insert ON sale_items;
CREATE POLICY sale_items_insert ON sale_items
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS sale_items_update ON sale_items;
CREATE POLICY sale_items_update ON sale_items
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS invoices_select ON invoices;
CREATE POLICY invoices_select ON invoices
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS invoices_insert ON invoices;
CREATE POLICY invoices_insert ON invoices
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS invoices_update ON invoices;
CREATE POLICY invoices_update ON invoices
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS payments_select ON payments;
CREATE POLICY payments_select ON payments
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS payments_insert ON payments;
CREATE POLICY payments_insert ON payments
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS payments_update ON payments;
CREATE POLICY payments_update ON payments
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());
