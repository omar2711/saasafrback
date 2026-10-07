BEGIN;
CREATE OR REPLACE FUNCTION app.is_platform_accountant() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public SET row_security=off AS $$
 SELECT EXISTS(SELECT 1 FROM users WHERE id=app.user_id() AND platform_role='accountant' AND status='active' AND deleted_at IS NULL);
$$;
DROP POLICY IF EXISTS platform_finance_read ON platform_payments;
CREATE POLICY platform_finance_read ON platform_payments FOR SELECT USING(app.is_platform_accountant());
DROP POLICY IF EXISTS platform_finance_org_read ON orgs;
CREATE POLICY platform_finance_org_read ON orgs FOR SELECT USING(app.is_platform_accountant());
DROP POLICY IF EXISTS platform_finance_subscription_read ON subscriptions;
CREATE POLICY platform_finance_subscription_read ON subscriptions FOR SELECT USING(app.is_platform_accountant());

CREATE OR REPLACE FUNCTION app.protect_platform_role() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.platform_role IS NOT NULL AND TG_OP='INSERT' AND NOT app.is_super_admin() THEN
   RAISE EXCEPTION 'Solo AFR puede asignar un rol administrativo';
 END IF;
 IF TG_OP='UPDATE' THEN
   IF OLD.platform_role IS DISTINCT FROM NEW.platform_role AND NOT app.is_super_admin() THEN
     RAISE EXCEPTION 'Solo AFR puede modificar un rol administrativo';
   END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_platform_role ON users;
CREATE TRIGGER protect_platform_role BEFORE INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION app.protect_platform_role();

-- También cubre cambios de suscripción desde los endpoints antiguos.
CREATE OR REPLACE FUNCTION app.enforce_subscription_capacity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public SET row_security=off AS $$
DECLARE resource record; used integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.org_id::text,34));
 FOR resource IN SELECT f.code,l.limit_value FROM plan_feature_limits l JOIN plan_features f ON f.id=l.feature_id
   WHERE l.plan_id=NEW.plan_id AND f.code IN('max_roles','max_products','max_users','max_branches') AND l.limit_value IS NOT NULL
 LOOP
  CASE resource.code
   WHEN 'max_roles' THEN SELECT count(*) INTO used FROM roles WHERE org_id=NEW.org_id AND deleted_at IS NULL;
   WHEN 'max_products' THEN SELECT count(*) INTO used FROM products WHERE org_id=NEW.org_id AND deleted_at IS NULL;
   WHEN 'max_users' THEN SELECT count(*) INTO used FROM org_members WHERE org_id=NEW.org_id AND deleted_at IS NULL;
   WHEN 'max_branches' THEN SELECT count(*) INTO used FROM branches WHERE org_id=NEW.org_id AND deleted_at IS NULL;
  END CASE;
  IF used>resource.limit_value THEN RAISE EXCEPTION 'Limit exceeded for %',resource.code; END IF;
 END LOOP;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS subscription_capacity ON subscriptions;
CREATE TRIGGER subscription_capacity BEFORE INSERT OR UPDATE OF plan_id ON subscriptions FOR EACH ROW EXECUTE FUNCTION app.enforce_subscription_capacity();
COMMIT;
