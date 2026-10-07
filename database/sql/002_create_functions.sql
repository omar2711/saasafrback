CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.set_context(
  p_user_id uuid,
  p_org_id uuid,
  p_member_id uuid,
  p_is_super_admin boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.user_id', COALESCE(p_user_id::text, ''), false);
  PERFORM set_config('app.org_id', COALESCE(p_org_id::text, ''), false);
  PERFORM set_config('app.member_id', COALESCE(p_member_id::text, ''), false);
  PERFORM set_config('app.is_super_admin', CASE WHEN p_is_super_admin THEN 'true' ELSE 'false' END, false);
END;
$$;

CREATE OR REPLACE FUNCTION app.user_id() RETURNS uuid
LANGUAGE sql
AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app.org_id() RETURNS uuid
LANGUAGE sql
AS $$
  SELECT NULLIF(current_setting('app.org_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app.member_id() RETURNS uuid
LANGUAGE sql
AS $$
  SELECT NULLIF(current_setting('app.member_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION app.is_super_admin() RETURNS boolean
LANGUAGE sql
AS $$
  SELECT current_setting('app.is_super_admin', true) = 'true';
$$;

CREATE OR REPLACE FUNCTION app.is_org_member(p_org_id uuid) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM org_members om
    WHERE om.org_id = p_org_id
      AND om.user_id = app.user_id()
      AND om.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION app.can_manage_member(p_member_id uuid) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM org_members om
    WHERE om.id = p_member_id
      AND app.is_org_member(om.org_id)
      AND om.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION app.can_access_user(p_user_id uuid) RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT (
    p_user_id = app.user_id() OR EXISTS (
      SELECT 1
      FROM org_members om
      WHERE om.user_id = p_user_id
        AND app.is_org_member(om.org_id)
        AND om.deleted_at IS NULL
    )
  );
$$;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orgs_updated_at ON orgs;
CREATE TRIGGER trg_orgs_updated_at
BEFORE UPDATE ON orgs
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_branches_updated_at ON branches;
CREATE TRIGGER trg_branches_updated_at
BEFORE UPDATE ON branches
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_org_members_updated_at ON org_members;
CREATE TRIGGER trg_org_members_updated_at
BEFORE UPDATE ON org_members
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_plans_updated_at ON plans;
CREATE TRIGGER trg_plans_updated_at
BEFORE UPDATE ON plans
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
