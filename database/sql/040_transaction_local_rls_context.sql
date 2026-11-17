CREATE OR REPLACE FUNCTION app.set_context(
  p_user_id uuid,
  p_org_id uuid,
  p_member_id uuid,
  p_is_super_admin boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.user_id', COALESCE(p_user_id::text, ''), true);
  PERFORM set_config('app.org_id', COALESCE(p_org_id::text, ''), true);
  PERFORM set_config('app.member_id', COALESCE(p_member_id::text, ''), true);
  PERFORM set_config('app.is_super_admin', CASE WHEN p_is_super_admin THEN 'true' ELSE 'false' END, true);
END;
$$;
