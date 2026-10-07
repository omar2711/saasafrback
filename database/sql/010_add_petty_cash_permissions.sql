-- =============================================================================
-- 010: Permisos de Caja Chica + Plan Enterprise
-- Ejecutar si el seed fue corrido antes de agregar el módulo de caja chica.
-- Es idempotente (re-ejecutable con ON CONFLICT DO NOTHING).
-- =============================================================================

BEGIN;

SELECT set_config('app.is_super_admin', 'true', true);

-- 1. Plan enterprise (si no existe)
INSERT INTO plans (id, code, name, price_monthly, price_yearly, status)
VALUES ('99999999-0000-0000-0000-000000000002', 'enterprise', 'Empresarial', 599.00, 5990.00, 'active')
ON CONFLICT (code) DO NOTHING;

-- 2. Feature module_petty_cash (si no existe)
INSERT INTO plan_features (id, code, description)
VALUES ('f0000001-0000-0000-0000-000000000007', 'module_petty_cash', 'Módulo de caja chica')
ON CONFLICT (code) DO NOTHING;

-- 3. Asignar feature al plan enterprise
INSERT INTO plan_feature_limits (plan_id, feature_id, limit_value)
SELECT
  (SELECT id FROM plans WHERE code = 'enterprise'),
  (SELECT id FROM plan_features WHERE code = 'module_petty_cash'),
  NULL
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- 4. Permisos RBAC de caja chica
INSERT INTO permissions (id, code, description) VALUES
  ('4d000001-0000-0000-0000-000000000024', 'petty_cash.read',  'Ver caja chica'),
  ('4d000001-0000-0000-0000-000000000025', 'petty_cash.write', 'Registrar movimientos de caja chica')
ON CONFLICT (code) DO NOTHING;

-- 5. Asignar a rol Gerente (acceso total en la org demo)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Gerente'
  AND p.code IN ('petty_cash.read', 'petty_cash.write')
ON CONFLICT DO NOTHING;

-- 6. Asignar a rol Administrador
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Administrador'
  AND p.code IN ('petty_cash.read', 'petty_cash.write')
ON CONFLICT DO NOTHING;

-- 7. Actualizar suscripción de la org demo a plan enterprise
--    (solo si actualmente está en professional)
UPDATE subscriptions
SET plan_id = (SELECT id FROM plans WHERE code = 'enterprise')
WHERE org_id = '11111111-0000-0000-0000-000000000001'
  AND plan_id = (SELECT id FROM plans WHERE code = 'professional');

COMMIT;
