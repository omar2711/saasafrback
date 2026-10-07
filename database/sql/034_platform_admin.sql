BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role text
  CHECK (platform_role IN ('super_admin', 'accountant'));
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS responsible_name text,
  ADD COLUMN IF NOT EXISTS legal_representative text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS logo text;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BOB';

CREATE TABLE IF NOT EXISTS platform_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  plan_id uuid NOT NULL REFERENCES plans(id),
  plan_name text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  paid_on date NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','paid','voided')),
  reference text NOT NULL UNIQUE,
  notes text NOT NULL DEFAULT '',
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_payments_date_idx ON platform_payments(paid_on, org_id);
ALTER TABLE platform_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_payments_admin ON platform_payments;
CREATE POLICY platform_payments_admin ON platform_payments FOR ALL
  USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());

CREATE TABLE IF NOT EXISTS platform_legal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('terms','privacy')),
  version text NOT NULL,
  content text NOT NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kind,version)
);
ALTER TABLE platform_legal_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS legal_read ON platform_legal_documents;
CREATE POLICY legal_read ON platform_legal_documents FOR SELECT USING (published_at IS NOT NULL OR app.is_super_admin());
DROP POLICY IF EXISTS legal_write ON platform_legal_documents;
CREATE POLICY legal_write ON platform_legal_documents FOR INSERT WITH CHECK (app.is_super_admin());
DROP POLICY IF EXISTS legal_update ON platform_legal_documents;
CREATE POLICY legal_update ON platform_legal_documents FOR UPDATE USING (app.is_super_admin()) WITH CHECK (app.is_super_admin());
CREATE TABLE IF NOT EXISTS platform_legal_acceptances (
  user_id uuid NOT NULL REFERENCES users(id),
  document_id uuid NOT NULL REFERENCES platform_legal_documents(id),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,document_id)
);
ALTER TABLE platform_legal_acceptances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS legal_accept_self ON platform_legal_acceptances;
CREATE POLICY legal_accept_self ON platform_legal_acceptances FOR ALL
  USING (user_id = app.user_id() OR app.is_super_admin())
  WITH CHECK (user_id = app.user_id());

INSERT INTO plan_features(code,description) VALUES
 ('max_roles','Cantidad máxima de roles'),('max_products','Cantidad máxima de productos'),
 ('module_inventory','Inventario y productos'),('module_sales','Ventas'),
 ('module_reports','Reportes'),('module_audit','Auditoría'),('module_customers','Clientes'),
 ('module_transfers','Traspasos'),('module_kits','Kits')
ON CONFLICT(code) DO NOTHING;
-- Mantener disponibles los módulos básicos existentes al migrar los planes actuales.
INSERT INTO plan_feature_limits(plan_id,feature_id,limit_value)
 SELECT p.id,f.id,NULL FROM plans p CROSS JOIN plan_features f
 WHERE f.code IN ('max_roles','max_products','module_inventory','module_sales','module_reports',
                 'module_audit','module_customers','module_transfers','module_kits')
ON CONFLICT DO NOTHING;

-- El bloqueo por organización serializa altas/restauraciones para no superar cupos.
CREATE OR REPLACE FUNCTION app.enforce_admin_resource_limit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET row_security = off AS $$
DECLARE resource_count integer;
BEGIN
 IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
 IF TG_OP = 'UPDATE' THEN
   IF OLD.deleted_at IS NULL AND OLD.org_id = NEW.org_id THEN RETURN NEW; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.org_id::text, 34));
 IF TG_TABLE_NAME = 'products' THEN
   SELECT count(*) INTO resource_count FROM products WHERE org_id=NEW.org_id AND deleted_at IS NULL AND id<>NEW.id;
   PERFORM app.assert_feature_limit(NEW.org_id,'max_products',resource_count);
 ELSE
   SELECT count(*) INTO resource_count FROM roles WHERE org_id=NEW.org_id AND deleted_at IS NULL AND id<>NEW.id;
   PERFORM app.assert_feature_limit(NEW.org_id,'max_roles',resource_count);
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS products_admin_limit ON products;
CREATE TRIGGER products_admin_limit BEFORE INSERT OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION app.enforce_admin_resource_limit();
DROP TRIGGER IF EXISTS roles_admin_limit ON roles;
CREATE TRIGGER roles_admin_limit BEFORE INSERT OR UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION app.enforce_admin_resource_limit();

COMMIT;
