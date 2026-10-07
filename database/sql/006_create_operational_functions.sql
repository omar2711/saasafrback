CREATE OR REPLACE FUNCTION app.plan_feature_value(
  p_org_id uuid,
  p_feature_code text
) RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT pfl.limit_value
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  JOIN plan_feature_limits pfl ON pfl.plan_id = p.id
  JOIN plan_features pf ON pf.id = pfl.feature_id
  WHERE s.org_id = p_org_id
    AND s.status IN ('active', 'past_due')
    AND s.deleted_at IS NULL
    AND pf.code = p_feature_code
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app.plan_feature_enabled(
  p_org_id uuid,
  p_feature_code text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_limit integer;
BEGIN
  SELECT pfl.limit_value
  INTO v_limit
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  JOIN plan_feature_limits pfl ON pfl.plan_id = p.id
  JOIN plan_features pf ON pf.id = pfl.feature_id
  WHERE s.org_id = p_org_id
    AND s.status IN ('active', 'past_due')
    AND s.deleted_at IS NULL
    AND pf.code = p_feature_code
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF v_limit IS NULL THEN
    RETURN true;
  END IF;

  RETURN v_limit > 0;
END;
$$;

CREATE OR REPLACE FUNCTION app.assert_feature_enabled(
  p_org_id uuid,
  p_feature_code text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NOT app.plan_feature_enabled(p_org_id, p_feature_code) THEN
    RAISE EXCEPTION 'Feature % not enabled for this organization', p_feature_code;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION app.assert_feature_limit(
  p_org_id uuid,
  p_feature_code text,
  p_current_count integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_limit integer;
BEGIN
  SELECT pfl.limit_value
  INTO v_limit
  FROM subscriptions s
  JOIN plans p ON p.id = s.plan_id
  JOIN plan_feature_limits pfl ON pfl.plan_id = p.id
  JOIN plan_features pf ON pf.id = pfl.feature_id
  WHERE s.org_id = p_org_id
    AND s.status IN ('active', 'past_due')
    AND s.deleted_at IS NULL
    AND pf.code = p_feature_code
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_limit IS NULL THEN
    RETURN;
  END IF;

  IF v_limit <= 0 THEN
    RAISE EXCEPTION 'Limit % not available for this organization', p_feature_code;
  END IF;

  IF (p_current_count + 1) > v_limit THEN
    RAISE EXCEPTION 'Limit exceeded for %', p_feature_code;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION app.enforce_max_branches() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM branches b
  WHERE b.org_id = NEW.org_id
    AND b.deleted_at IS NULL;

  PERFORM app.assert_feature_limit(NEW.org_id, 'max_branches', v_count);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app.enforce_max_users() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM org_members om
  WHERE om.org_id = NEW.org_id
    AND om.deleted_at IS NULL;

  PERFORM app.assert_feature_limit(NEW.org_id, 'max_users', v_count);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app.enforce_feature() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  PERFORM app.assert_feature_enabled(NEW.org_id, TG_ARGV[0]);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app.enforce_discount_header() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF COALESCE(NEW.discount_total, 0) > 0 THEN
    PERFORM app.assert_feature_enabled(NEW.org_id, 'module_discounts');
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app.enforce_discount_line() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF COALESCE(NEW.discount, 0) > 0 THEN
    PERFORM app.assert_feature_enabled(NEW.org_id, 'module_discounts');
  END IF;

  RETURN NEW;
END;
$$;
