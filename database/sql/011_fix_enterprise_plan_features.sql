-- =============================================================================
-- 011: Completar features del plan Empresarial
-- El plan enterprise fue creado en 010 con solo module_petty_cash.
-- Esta migración agrega las features que ya tenía el plan profesional.
-- Es idempotente (ON CONFLICT DO NOTHING).
-- =============================================================================

BEGIN;

SELECT set_config('app.is_super_admin', 'true', true);

-- Asegurar que todas las features del sistema existen
INSERT INTO plan_features (id, code, description) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'module_suppliers',   'Módulo de proveedores'),
  ('f0000001-0000-0000-0000-000000000002', 'module_purchases',   'Módulo de órdenes de compra'),
  ('f0000001-0000-0000-0000-000000000003', 'module_quotes',      'Módulo de cotizaciones'),
  ('f0000001-0000-0000-0000-000000000004', 'module_discounts',   'Descuentos en ventas y cotizaciones'),
  ('f0000001-0000-0000-0000-000000000005', 'max_branches',       'Máximo de sucursales'),
  ('f0000001-0000-0000-0000-000000000006', 'max_users',          'Máximo de usuarios')
ON CONFLICT (code) DO NOTHING;

-- Asignar todas las features al plan Empresarial (ilimitado, NULL)
INSERT INTO plan_feature_limits (plan_id, feature_id, limit_value)
SELECT
  (SELECT id FROM plans WHERE code = 'enterprise'),
  pf.id,
  NULL
FROM plan_features pf
WHERE pf.code IN (
  'module_suppliers', 'module_purchases', 'module_quotes',
  'module_discounts', 'max_branches', 'max_users', 'module_petty_cash'
)
ON CONFLICT (plan_id, feature_id) DO NOTHING;

COMMIT;
