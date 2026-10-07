-- =============================================================================
-- 017: Permisos nuevos para las funcionalidades agregadas
--   inventory.transfer  -> traspasos entre sucursales
--   products.pricing    -> precios por sucursal (tab admin)
--   categories.write    -> gestion de categorias
--   roles.manage        -> panel de creacion de roles
-- Se otorgan a los roles de sistema 'Gerente' y 'Administrador' de cada org.
-- =============================================================================

BEGIN;

INSERT INTO permissions (code, description) VALUES
  ('inventory.transfer', 'Crear, recibir y anular traspasos entre sucursales'),
  ('products.pricing',   'Gestionar precios por sucursal'),
  ('categories.write',   'Crear/editar categorias de productos'),
  ('roles.manage',       'Gestionar roles y permisos de la organizacion')
ON CONFLICT (code) DO NOTHING;

-- Otorgar a todos los roles de sistema Gerente y Administrador existentes
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.is_system = true
  AND r.name IN ('Gerente', 'Administrador')
  AND p.code IN ('inventory.transfer', 'products.pricing', 'categories.write', 'roles.manage')
ON CONFLICT DO NOTHING;

COMMIT;
