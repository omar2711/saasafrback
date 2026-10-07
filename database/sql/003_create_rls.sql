ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_member_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_feature_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select ON users;
CREATE POLICY users_select ON users
FOR SELECT
USING (app.can_access_user(id) OR app.is_super_admin());

DROP POLICY IF EXISTS users_insert ON users;
CREATE POLICY users_insert ON users
FOR INSERT
WITH CHECK (app.user_id() IS NOT NULL OR app.is_super_admin());

DROP POLICY IF EXISTS users_update ON users;
CREATE POLICY users_update ON users
FOR UPDATE
USING (app.can_access_user(id) OR app.is_super_admin())
WITH CHECK (app.can_access_user(id) OR app.is_super_admin());

DROP POLICY IF EXISTS orgs_select ON orgs;
CREATE POLICY orgs_select ON orgs
FOR SELECT
USING (app.is_org_member(id) OR app.is_super_admin());

DROP POLICY IF EXISTS orgs_insert ON orgs;
CREATE POLICY orgs_insert ON orgs
FOR INSERT
WITH CHECK (app.user_id() IS NOT NULL OR app.is_super_admin());

DROP POLICY IF EXISTS orgs_update ON orgs;
CREATE POLICY orgs_update ON orgs
FOR UPDATE
USING (app.is_org_member(id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(id) OR app.is_super_admin());

DROP POLICY IF EXISTS branches_select ON branches;
CREATE POLICY branches_select ON branches
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS branches_insert ON branches;
CREATE POLICY branches_insert ON branches
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS branches_update ON branches;
CREATE POLICY branches_update ON branches
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS org_members_select ON org_members;
CREATE POLICY org_members_select ON org_members
FOR SELECT
USING (
  user_id = app.user_id()
  OR app.is_org_member(org_id)
  OR app.is_super_admin()
);

DROP POLICY IF EXISTS org_members_insert ON org_members;
CREATE POLICY org_members_insert ON org_members
FOR INSERT
WITH CHECK (
  app.is_super_admin()
  OR app.is_org_member(org_id)
  OR (
    user_id = app.user_id()
    AND NOT EXISTS (
      SELECT 1
      FROM org_members om
      WHERE om.org_id = org_id
        AND om.deleted_at IS NULL
    )
  )
);

DROP POLICY IF EXISTS org_members_update ON org_members;
CREATE POLICY org_members_update ON org_members
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS org_member_invites_select ON org_member_invites;
CREATE POLICY org_member_invites_select ON org_member_invites
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS org_member_invites_insert ON org_member_invites;
CREATE POLICY org_member_invites_insert ON org_member_invites
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS org_member_invites_update ON org_member_invites;
CREATE POLICY org_member_invites_update ON org_member_invites
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS roles_select ON roles;
CREATE POLICY roles_select ON roles
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS roles_insert ON roles;
CREATE POLICY roles_insert ON roles
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS roles_update ON roles;
CREATE POLICY roles_update ON roles
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS permissions_select ON permissions;
CREATE POLICY permissions_select ON permissions
FOR SELECT
USING (true);

DROP POLICY IF EXISTS permissions_insert ON permissions;
CREATE POLICY permissions_insert ON permissions
FOR INSERT
WITH CHECK (app.is_super_admin());

DROP POLICY IF EXISTS permissions_update ON permissions;
CREATE POLICY permissions_update ON permissions
FOR UPDATE
USING (app.is_super_admin())
WITH CHECK (app.is_super_admin());

DROP POLICY IF EXISTS role_permissions_select ON role_permissions;
CREATE POLICY role_permissions_select ON role_permissions
FOR SELECT
USING (
  app.is_super_admin() OR EXISTS (
    SELECT 1
    FROM roles r
    WHERE r.id = role_permissions.role_id
      AND app.is_org_member(r.org_id)
  )
);

DROP POLICY IF EXISTS role_permissions_insert ON role_permissions;
CREATE POLICY role_permissions_insert ON role_permissions
FOR INSERT
WITH CHECK (
  app.is_super_admin() OR EXISTS (
    SELECT 1
    FROM roles r
    WHERE r.id = role_permissions.role_id
      AND app.is_org_member(r.org_id)
  )
);

DROP POLICY IF EXISTS role_permissions_update ON role_permissions;
CREATE POLICY role_permissions_update ON role_permissions
FOR UPDATE
USING (
  app.is_super_admin() OR EXISTS (
    SELECT 1
    FROM roles r
    WHERE r.id = role_permissions.role_id
      AND app.is_org_member(r.org_id)
  )
)
WITH CHECK (
  app.is_super_admin() OR EXISTS (
    SELECT 1
    FROM roles r
    WHERE r.id = role_permissions.role_id
      AND app.is_org_member(r.org_id)
  )
);

DROP POLICY IF EXISTS user_roles_select ON user_roles;
CREATE POLICY user_roles_select ON user_roles
FOR SELECT
USING (app.is_super_admin() OR app.can_manage_member(org_member_id));

DROP POLICY IF EXISTS user_roles_insert ON user_roles;
CREATE POLICY user_roles_insert ON user_roles
FOR INSERT
WITH CHECK (app.is_super_admin() OR app.can_manage_member(org_member_id));

DROP POLICY IF EXISTS user_roles_update ON user_roles;
CREATE POLICY user_roles_update ON user_roles
FOR UPDATE
USING (app.is_super_admin() OR app.can_manage_member(org_member_id))
WITH CHECK (app.is_super_admin() OR app.can_manage_member(org_member_id));

DROP POLICY IF EXISTS plans_select ON plans;
CREATE POLICY plans_select ON plans
FOR SELECT
USING (true);

DROP POLICY IF EXISTS plans_insert ON plans;
CREATE POLICY plans_insert ON plans
FOR INSERT
WITH CHECK (app.is_super_admin());

DROP POLICY IF EXISTS plans_update ON plans;
CREATE POLICY plans_update ON plans
FOR UPDATE
USING (app.is_super_admin())
WITH CHECK (app.is_super_admin());

DROP POLICY IF EXISTS plan_features_select ON plan_features;
CREATE POLICY plan_features_select ON plan_features
FOR SELECT
USING (true);

DROP POLICY IF EXISTS plan_features_insert ON plan_features;
CREATE POLICY plan_features_insert ON plan_features
FOR INSERT
WITH CHECK (app.is_super_admin());

DROP POLICY IF EXISTS plan_features_update ON plan_features;
CREATE POLICY plan_features_update ON plan_features
FOR UPDATE
USING (app.is_super_admin())
WITH CHECK (app.is_super_admin());

DROP POLICY IF EXISTS plan_feature_limits_select ON plan_feature_limits;
CREATE POLICY plan_feature_limits_select ON plan_feature_limits
FOR SELECT
USING (true);

DROP POLICY IF EXISTS plan_feature_limits_insert ON plan_feature_limits;
CREATE POLICY plan_feature_limits_insert ON plan_feature_limits
FOR INSERT
WITH CHECK (app.is_super_admin());

DROP POLICY IF EXISTS plan_feature_limits_update ON plan_feature_limits;
CREATE POLICY plan_feature_limits_update ON plan_feature_limits
FOR UPDATE
USING (app.is_super_admin())
WITH CHECK (app.is_super_admin());

DROP POLICY IF EXISTS subscriptions_select ON subscriptions;
CREATE POLICY subscriptions_select ON subscriptions
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS subscriptions_insert ON subscriptions;
CREATE POLICY subscriptions_insert ON subscriptions
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS subscriptions_update ON subscriptions;
CREATE POLICY subscriptions_update ON subscriptions
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS subscription_events_select ON subscription_events;
CREATE POLICY subscription_events_select ON subscription_events
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS subscription_events_insert ON subscription_events;
CREATE POLICY subscription_events_insert ON subscription_events
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS subscription_events_update ON subscription_events;
CREATE POLICY subscription_events_update ON subscription_events
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS sessions_select ON sessions;
CREATE POLICY sessions_select ON sessions
FOR SELECT
USING (user_id = app.user_id() OR app.is_super_admin());

DROP POLICY IF EXISTS sessions_insert ON sessions;
CREATE POLICY sessions_insert ON sessions
FOR INSERT
WITH CHECK (user_id = app.user_id() OR app.is_super_admin());

DROP POLICY IF EXISTS sessions_update ON sessions;
CREATE POLICY sessions_update ON sessions
FOR UPDATE
USING (user_id = app.user_id() OR app.is_super_admin())
WITH CHECK (user_id = app.user_id() OR app.is_super_admin());

DROP POLICY IF EXISTS audit_logs_select ON audit_logs;
CREATE POLICY audit_logs_select ON audit_logs
FOR SELECT
USING (
  app.is_super_admin()
  OR (org_id IS NOT NULL AND app.is_org_member(org_id))
  OR user_id = app.user_id()
);

DROP POLICY IF EXISTS audit_logs_insert ON audit_logs;
CREATE POLICY audit_logs_insert ON audit_logs
FOR INSERT
WITH CHECK (app.user_id() IS NOT NULL OR app.is_super_admin());
