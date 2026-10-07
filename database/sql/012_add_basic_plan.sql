-- =============================================================================
-- 012: Plan Básico / Starter
-- Plan con funcionalidades mínimas: POS, inventario, dashboard, reportes básicos.
-- Sin: proveedores, compras, cotizaciones, caja chica.
-- Es idempotente (ON CONFLICT DO NOTHING).
-- =============================================================================

BEGIN;

SELECT set_config('app.is_super_admin', 'true', true);

-- Plan básico
INSERT INTO plans (id, code, name, price_monthly, price_yearly, status)
VALUES ('99999999-0000-0000-0000-000000000003', 'basic', 'Básico', 99.00, 990.00, 'active')
ON CONFLICT (code) DO NOTHING;

-- El plan básico NO tiene módulos operativos avanzados.
-- Solo tiene max_branches y max_users con límites bajos.
INSERT INTO plan_feature_limits (plan_id, feature_id, limit_value)
SELECT
  (SELECT id FROM plans WHERE code = 'basic'),
  pf.id,
  CASE pf.code
    WHEN 'max_branches' THEN 2
    WHEN 'max_users'    THEN 2
    ELSE NULL
  END
FROM plan_features pf
WHERE pf.code IN ('max_branches', 'max_users')
ON CONFLICT (plan_id, feature_id) DO NOTHING;

COMMIT;
