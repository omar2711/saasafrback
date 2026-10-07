DROP TRIGGER IF EXISTS trg_branches_plan_limit ON branches;
CREATE TRIGGER trg_branches_plan_limit
BEFORE INSERT ON branches
FOR EACH ROW
EXECUTE FUNCTION app.enforce_max_branches();

DROP TRIGGER IF EXISTS trg_org_members_plan_limit ON org_members;
CREATE TRIGGER trg_org_members_plan_limit
BEFORE INSERT ON org_members
FOR EACH ROW
EXECUTE FUNCTION app.enforce_max_users();

DROP TRIGGER IF EXISTS trg_suppliers_feature ON suppliers;
CREATE TRIGGER trg_suppliers_feature
BEFORE INSERT ON suppliers
FOR EACH ROW
EXECUTE FUNCTION app.enforce_feature('module_suppliers');

DROP TRIGGER IF EXISTS trg_purchase_orders_feature ON purchase_orders;
CREATE TRIGGER trg_purchase_orders_feature
BEFORE INSERT ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION app.enforce_feature('module_purchases');

DROP TRIGGER IF EXISTS trg_purchase_order_items_feature ON purchase_order_items;
CREATE TRIGGER trg_purchase_order_items_feature
BEFORE INSERT ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION app.enforce_feature('module_purchases');

DROP TRIGGER IF EXISTS trg_quotes_feature ON quotes;
CREATE TRIGGER trg_quotes_feature
BEFORE INSERT ON quotes
FOR EACH ROW
EXECUTE FUNCTION app.enforce_feature('module_quotes');

DROP TRIGGER IF EXISTS trg_quote_items_feature ON quote_items;
CREATE TRIGGER trg_quote_items_feature
BEFORE INSERT ON quote_items
FOR EACH ROW
EXECUTE FUNCTION app.enforce_feature('module_quotes');

DROP TRIGGER IF EXISTS trg_invoices_feature ON invoices;
CREATE TRIGGER trg_invoices_feature
BEFORE INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION app.enforce_feature('module_invoicing');

DROP TRIGGER IF EXISTS trg_quotes_discount_feature ON quotes;
CREATE TRIGGER trg_quotes_discount_feature
BEFORE INSERT OR UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION app.enforce_discount_header();

DROP TRIGGER IF EXISTS trg_quote_items_discount_feature ON quote_items;
CREATE TRIGGER trg_quote_items_discount_feature
BEFORE INSERT OR UPDATE ON quote_items
FOR EACH ROW
EXECUTE FUNCTION app.enforce_discount_line();

DROP TRIGGER IF EXISTS trg_sales_discount_feature ON sales;
CREATE TRIGGER trg_sales_discount_feature
BEFORE INSERT OR UPDATE ON sales
FOR EACH ROW
EXECUTE FUNCTION app.enforce_discount_header();

DROP TRIGGER IF EXISTS trg_sale_items_discount_feature ON sale_items;
CREATE TRIGGER trg_sale_items_discount_feature
BEFORE INSERT OR UPDATE ON sale_items
FOR EACH ROW
EXECUTE FUNCTION app.enforce_discount_line();

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
CREATE TRIGGER trg_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_stock_updated_at ON inventory_stock;
CREATE TRIGGER trg_inventory_stock_updated_at
BEFORE UPDATE ON inventory_stock
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated_at
BEFORE UPDATE ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_quotes_updated_at ON quotes;
CREATE TRIGGER trg_quotes_updated_at
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_updated_at ON sales;
CREATE TRIGGER trg_sales_updated_at
BEFORE UPDATE ON sales
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
