-- =============================================================================
-- SEED DEMO: Tecnología Andina SRL
-- Empresa ficticia boliviana de venta de tecnología
-- 5 usuarios, 2 sucursales, datos operativos completos
--
-- Contraseña de todos los usuarios: Password123!
-- Para ejecutar: psql -U <user> -d <db> -f seed_demo.sql
-- Es idempotente (re-ejecutable con ON CONFLICT DO NOTHING / DO UPDATE)
-- =============================================================================

BEGIN;

-- Activa contexto de super-admin para bypass de RLS durante el seed.
-- Las tablas plans/permissions/plan_features requieren is_super_admin para INSERT.
SELECT set_config('app.is_super_admin', 'true', true);

-- =============================================================================
-- 1. PLANES
-- =============================================================================
INSERT INTO plans (id, code, name, price_monthly, price_yearly, status)
VALUES
  ('99999999-0000-0000-0000-000000000003', 'basic',        'Básico',       99.00,   990.00, 'active'),
  ('99999999-0000-0000-0000-000000000001', 'professional', 'Profesional', 299.00, 2990.00, 'active'),
  ('99999999-0000-0000-0000-000000000002', 'enterprise',   'Empresarial', 599.00, 5990.00, 'active')
ON CONFLICT (code) DO NOTHING;

-- Plan Básico: solo límites de sucursales y usuarios (sin módulos operativos avanzados)
INSERT INTO plan_feature_limits (plan_id, feature_id, limit_value)
SELECT
  (SELECT id FROM plans WHERE code = 'basic'),
  pf.id,
  CASE pf.code WHEN 'max_branches' THEN 2 WHEN 'max_users' THEN 2 ELSE NULL END
FROM plan_features pf
WHERE pf.code IN ('max_branches', 'max_users')
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- Features del sistema
INSERT INTO plan_features (id, code, description) VALUES
  ('f0000001-0000-0000-0000-000000000001', 'module_suppliers',   'Módulo de proveedores'),
  ('f0000001-0000-0000-0000-000000000002', 'module_purchases',   'Módulo de órdenes de compra'),
  ('f0000001-0000-0000-0000-000000000003', 'module_quotes',      'Módulo de cotizaciones'),
  ('f0000001-0000-0000-0000-000000000004', 'module_discounts',   'Descuentos en ventas y cotizaciones'),
  ('f0000001-0000-0000-0000-000000000005', 'max_branches',       'Máximo de sucursales'),
  ('f0000001-0000-0000-0000-000000000006', 'max_users',          'Máximo de usuarios'),
  ('f0000001-0000-0000-0000-000000000007', 'module_petty_cash',  'Módulo de caja chica')
ON CONFLICT (code) DO NOTHING;

-- Plan Profesional: todos los módulos excepto caja chica
INSERT INTO plan_feature_limits (plan_id, feature_id, limit_value)
SELECT
  (SELECT id FROM plans WHERE code = 'professional'),
  pf.id,
  CASE pf.code
    WHEN 'max_branches' THEN 5
    WHEN 'max_users'    THEN 10
    ELSE NULL
  END
FROM plan_features pf
WHERE pf.code IN (
  'module_suppliers', 'module_purchases', 'module_quotes',
  'module_discounts', 'max_branches', 'max_users'
)
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- Plan Empresarial: todo lo anterior + caja chica + ilimitado
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

-- =============================================================================
-- 2. ORGANIZACIÓN
-- =============================================================================
INSERT INTO orgs (id, name, tax_id, status, timezone)
VALUES (
  '11111111-0000-0000-0000-000000000001',
  'Tecnología Andina SRL',
  '1234567890',
  'active',
  'America/La_Paz'
) ON CONFLICT (id) DO NOTHING;

-- Suscripción: demo usa plan Empresarial para mostrar todas las features
INSERT INTO subscriptions (id, org_id, plan_id, status, start_date, renewal_period)
VALUES (
  '4b000001-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  (SELECT id FROM plans WHERE code = 'enterprise'),
  'active',
  CURRENT_DATE,
  'monthly'
) ON CONFLICT (org_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status  = 'active';

-- =============================================================================
-- 3. SUCURSALES
-- =============================================================================
INSERT INTO branches (id, org_id, name, address, city, phone, status)
VALUES
  (
    '22222222-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001',
    'Sucursal Central',
    'Av. San Martín N°456, Equipetrol',
    'Santa Cruz de la Sierra',
    '+591 3-3456789',
    'active'
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000001',
    'Sucursal Norte',
    'Calle Comercio N°123, Sopocachi',
    'La Paz',
    '+591 2-2456789',
    'active'
  )
ON CONFLICT (org_id, name) DO NOTHING;

-- =============================================================================
-- 4. USUARIOS (contraseña: Password123!)
-- =============================================================================
-- Si el usuario ya existe (por email), actualiza nombre/teléfono/contraseña
-- pero conserva su UUID original para que los JWT anteriores sigan válidos.
INSERT INTO users (id, email, password_hash, full_name, phone, status)
VALUES
  (
    '33333333-0000-0000-0000-000000000001',
    'gerente@tecnologiaandina.bo',
    crypt('Password123!', gen_salt('bf', 10)),
    'Juan Carlos Mendoza',
    '+591 70011111',
    'active'
  ),
  (
    '33333333-0000-0000-0000-000000000002',
    'admin@tecnologiaandina.bo',
    crypt('Password123!', gen_salt('bf', 10)),
    'María Elena Quispe',
    '+591 70022222',
    'active'
  ),
  (
    '33333333-0000-0000-0000-000000000003',
    'vendedor1@tecnologiaandina.bo',
    crypt('Password123!', gen_salt('bf', 10)),
    'Roberto Vargas Flores',
    '+591 70033333',
    'active'
  ),
  (
    '33333333-0000-0000-0000-000000000004',
    'vendedor2@tecnologiaandina.bo',
    crypt('Password123!', gen_salt('bf', 10)),
    'Ana Sofía Torrico',
    '+591 70044444',
    'active'
  ),
  (
    '33333333-0000-0000-0000-000000000005',
    'almacen@tecnologiaandina.bo',
    crypt('Password123!', gen_salt('bf', 10)),
    'Diego Mamani Condori',
    '+591 70055555',
    'active'
  )
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  full_name     = EXCLUDED.full_name,
  phone         = EXCLUDED.phone,
  status        = EXCLUDED.status;

-- =============================================================================
-- 5. MIEMBROS DE LA ORGANIZACIÓN
-- Resuelve user_id por email para ser robusto ante UUIDs diferentes.
-- =============================================================================
INSERT INTO org_members (org_id, user_id, status)
SELECT '11111111-0000-0000-0000-000000000001', u.id, 'active'
FROM users u
WHERE u.email IN (
  'gerente@tecnologiaandina.bo',
  'admin@tecnologiaandina.bo',
  'vendedor1@tecnologiaandina.bo',
  'vendedor2@tecnologiaandina.bo',
  'almacen@tecnologiaandina.bo'
)
ON CONFLICT (org_id, user_id) DO UPDATE SET
  status     = 'active',
  deleted_at = NULL;

-- Asignar sucursal a usuarios sin permiso de ver todas (vendedores/almacenero).
-- Gerente y Administrador quedan sin sucursal asignada (ven todas).
UPDATE org_members om SET branch_id = '22222222-0000-0000-0000-000000000001'
FROM users u
WHERE om.user_id = u.id
  AND om.org_id = '11111111-0000-0000-0000-000000000001'
  AND u.email IN ('vendedor1@tecnologiaandina.bo', 'vendedor2@tecnologiaandina.bo');

UPDATE org_members om SET branch_id = '22222222-0000-0000-0000-000000000002'
FROM users u
WHERE om.user_id = u.id
  AND om.org_id = '11111111-0000-0000-0000-000000000001'
  AND u.email = 'almacen@tecnologiaandina.bo';

-- =============================================================================
-- 6. PERMISOS (granulares por módulo)
-- =============================================================================
INSERT INTO permissions (id, code, description) VALUES
  ('4d000001-0000-0000-0000-000000000001', 'suppliers.read',    'Ver proveedores'),
  ('4d000001-0000-0000-0000-000000000002', 'suppliers.write',   'Crear/editar proveedores'),
  ('4d000001-0000-0000-0000-000000000003', 'suppliers.delete',  'Eliminar proveedores'),
  ('4d000001-0000-0000-0000-000000000004', 'products.read',     'Ver productos'),
  ('4d000001-0000-0000-0000-000000000005', 'products.write',    'Crear/editar productos'),
  ('4d000001-0000-0000-0000-000000000006', 'products.delete',   'Eliminar productos'),
  ('4d000001-0000-0000-0000-000000000007', 'inventory.read',    'Ver inventario y stock'),
  ('4d000001-0000-0000-0000-000000000008', 'inventory.write',   'Ajustar stock y movimientos'),
  ('4d000001-0000-0000-0000-000000000009', 'purchases.read',    'Ver órdenes de compra'),
  ('4d000001-0000-0000-0000-000000000010', 'purchases.write',   'Crear/editar órdenes de compra'),
  ('4d000001-0000-0000-0000-000000000011', 'quotes.read',       'Ver cotizaciones'),
  ('4d000001-0000-0000-0000-000000000012', 'quotes.write',      'Crear/editar cotizaciones'),
  ('4d000001-0000-0000-0000-000000000013', 'quotes.convert',    'Convertir cotización a venta'),
  ('4d000001-0000-0000-0000-000000000014', 'sales.read',        'Ver ventas'),
  ('4d000001-0000-0000-0000-000000000015', 'sales.write',       'Crear/editar ventas'),
  ('4d000001-0000-0000-0000-000000000016', 'sales.void',        'Anular ventas'),
  ('4d000001-0000-0000-0000-000000000017', 'reports.read',      'Ver reportes'),
  ('4d000001-0000-0000-0000-000000000018', 'settings.read',     'Ver configuración'),
  ('4d000001-0000-0000-0000-000000000019', 'settings.write',    'Modificar configuración'),
  ('4d000001-0000-0000-0000-000000000020', 'users.read',        'Ver usuarios'),
  ('4d000001-0000-0000-0000-000000000021', 'users.write',       'Crear/editar usuarios'),
  ('4d000001-0000-0000-0000-000000000022', 'customers.read',      'Ver clientes'),
  ('4d000001-0000-0000-0000-000000000023', 'customers.write',     'Crear/editar clientes'),
  ('4d000001-0000-0000-0000-000000000024', 'petty_cash.read',     'Ver caja chica'),
  ('4d000001-0000-0000-0000-000000000025', 'petty_cash.write',    'Registrar movimientos de caja chica'),
  ('4d000001-0000-0000-0000-000000000026', 'inventory.transfer',  'Crear, recibir y anular traspasos entre sucursales'),
  ('4d000001-0000-0000-0000-000000000027', 'products.pricing',    'Gestionar precios por sucursal'),
  ('4d000001-0000-0000-0000-000000000028', 'categories.write',    'Crear/editar categorias de productos'),
  ('4d000001-0000-0000-0000-000000000029', 'roles.manage',        'Gestionar roles y permisos de la organizacion'),
  ('4d000001-0000-0000-0000-000000000030', 'branches.view_all',   'Ver y cambiar entre todas las sucursales'),
  ('4d000001-0000-0000-0000-000000000031', 'kits.write',          'Crear/editar/eliminar kits (combos de productos)'),
  ('4d000001-0000-0000-0000-000000000032', 'sales.deliver',       'Entregar ventas adelantadas (descuenta stock diferido)'),
  ('4d000001-0000-0000-0000-000000000033', 'sales.return',        'Registrar y anular devoluciones parciales de ventas'),
  ('4d000001-0000-0000-0000-000000000034', 'customers.delete',    'Eliminar clientes'),
  ('4d000001-0000-0000-0000-000000000035', 'inventory.write_off', 'Registrar bajas de inventario por dano, merma o perdida')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- 7. ROLES (por empresa)
-- =============================================================================
INSERT INTO roles (id, org_id, name, is_system)
VALUES
  ('4e000001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Gerente',        true),
  ('4e000001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Administrador',  true),
  ('4e000001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Vendedor',       true),
  ('4e000001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'Almacenero',     true)
ON CONFLICT (org_id, name) DO NOTHING;

-- =============================================================================
-- 8. PERMISOS POR ROL
-- =============================================================================

-- GERENTE: acceso total
INSERT INTO role_permissions (role_id, permission_id)
SELECT '4e000001-0000-0000-0000-000000000001', id FROM permissions
WHERE code IN (
  'suppliers.read', 'suppliers.write', 'suppliers.delete',
  'products.read', 'products.write', 'products.delete',
  'inventory.read', 'inventory.write',
  'purchases.read', 'purchases.write',
  'quotes.read', 'quotes.write', 'quotes.convert',
  'sales.read', 'sales.write', 'sales.void',
  'reports.read', 'settings.read', 'settings.write',
  'users.read', 'users.write', 'customers.read', 'customers.write',
  'petty_cash.read', 'petty_cash.write',
  'inventory.transfer', 'products.pricing', 'categories.write', 'roles.manage',
  'branches.view_all', 'kits.write', 'sales.deliver', 'sales.return',
  'customers.delete', 'inventory.write_off'
)
ON CONFLICT DO NOTHING;

-- ADMINISTRADOR: todo excepto anular ventas y modificar configuración
INSERT INTO role_permissions (role_id, permission_id)
SELECT '4e000001-0000-0000-0000-000000000002', id FROM permissions
WHERE code IN (
  'suppliers.read', 'suppliers.write', 'suppliers.delete',
  'products.read', 'products.write', 'products.delete',
  'inventory.read', 'inventory.write',
  'purchases.read', 'purchases.write',
  'quotes.read', 'quotes.write', 'quotes.convert',
  'sales.read', 'sales.write',
  'reports.read', 'settings.read',
  'users.read', 'users.write', 'customers.read', 'customers.write',
  'petty_cash.read', 'petty_cash.write',
  'inventory.transfer', 'products.pricing', 'categories.write', 'roles.manage',
  'branches.view_all', 'kits.write', 'sales.deliver',
  'customers.delete', 'inventory.write_off'
)
ON CONFLICT DO NOTHING;

-- VENDEDOR: sólo ventas, cotizaciones y ver productos/inventario
INSERT INTO role_permissions (role_id, permission_id)
SELECT '4e000001-0000-0000-0000-000000000003', id FROM permissions
WHERE code IN (
  'products.read',
  'inventory.read',
  'quotes.read', 'quotes.write', 'quotes.convert',
  'sales.read', 'sales.write',
  'customers.read', 'customers.write',
  'sales.deliver', 'sales.return'
)
ON CONFLICT DO NOTHING;

-- ALMACENERO: inventario y compras
INSERT INTO role_permissions (role_id, permission_id)
SELECT '4e000001-0000-0000-0000-000000000004', id FROM permissions
WHERE code IN (
  'products.read', 'products.write',
  'inventory.read', 'inventory.write',
  'suppliers.read',
  'purchases.read', 'purchases.write'
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 9. ASIGNAR ROLES A MIEMBROS
-- Resuelve org_member_id por email+org para ser robusto.
-- =============================================================================
INSERT INTO user_roles (org_member_id, role_id)
SELECT om.id, r.id
FROM org_members om
JOIN users u ON om.user_id = u.id
JOIN roles r ON r.org_id = om.org_id AND r.name = 'Gerente'
WHERE u.email = 'gerente@tecnologiaandina.bo'
  AND om.org_id = '11111111-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (org_member_id, role_id)
SELECT om.id, r.id
FROM org_members om
JOIN users u ON om.user_id = u.id
JOIN roles r ON r.org_id = om.org_id AND r.name = 'Administrador'
WHERE u.email = 'admin@tecnologiaandina.bo'
  AND om.org_id = '11111111-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (org_member_id, role_id)
SELECT om.id, r.id
FROM org_members om
JOIN users u ON om.user_id = u.id
JOIN roles r ON r.org_id = om.org_id AND r.name = 'Vendedor'
WHERE u.email = 'vendedor1@tecnologiaandina.bo'
  AND om.org_id = '11111111-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (org_member_id, role_id)
SELECT om.id, r.id
FROM org_members om
JOIN users u ON om.user_id = u.id
JOIN roles r ON r.org_id = om.org_id AND r.name = 'Vendedor'
WHERE u.email = 'vendedor2@tecnologiaandina.bo'
  AND om.org_id = '11111111-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (org_member_id, role_id)
SELECT om.id, r.id
FROM org_members om
JOIN users u ON om.user_id = u.id
JOIN roles r ON r.org_id = om.org_id AND r.name = 'Almacenero'
WHERE u.email = 'almacen@tecnologiaandina.bo'
  AND om.org_id = '11111111-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 10. PROVEEDORES
-- =============================================================================
INSERT INTO suppliers (id, org_id, name, tax_id, contact_name, email, phone, address, location, company, notes, status)
VALUES
  ('4f000001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'TechImport Bolivia', '1023456789', 'Carlos Vega',
   'cvega@techimport.bo', '+591 3-3112233',
   'Av. Roca y Coronado N°789', 'Santa Cruz, Bolivia',
   'TechImport Bolivia SRL', 'Proveedor principal de laptops y componentes. Entrega en 3-5 días.', 'active'),

  ('4f000001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   'Distribuidora Nacional', '1034567890', 'Patricia Lima',
   'plima@distnacional.bo', '+591 2-2334455',
   'Calle Loayza N°234, Centro', 'La Paz, Bolivia',
   'Distribuidora Nacional S.A.', 'Accesorios y periféricos. Pago a 30 días.', 'active'),

  ('4f000001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
   'Importaciones Pacífico', '1045678901', 'Miguel Torrez',
   'mtorrez@imppac.com', '+591 3-3445566',
   'Zona Franca El Cóndor N°45', 'Santa Cruz, Bolivia',
   'Importaciones del Pacífico SRL', 'Importador directo de Asia. Mejor precio en volumen.', 'active'),

  ('4f000001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001',
   'GlobalTech Bolivia', '1056789012', 'Sandra Rojas',
   'srojas@globaltech.bo', '+591 2-2556677',
   'Av. Arce N°2634', 'La Paz, Bolivia',
   'GlobalTech Sucursal Bolivia', 'Productos de marca premium. Garantía oficial.', 'active'),

  ('4f000001-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001',
   'CableTech SRL', '1067890123', 'Fernando Mamani',
   'fmamani@cabletech.bo', '+591 3-3667788',
   'Mercado Los Pozos, Local 45', 'Santa Cruz, Bolivia',
   'CableTech SRL', 'Cables, adaptadores y accesorios genéricos a buen precio.', 'inactive')
ON CONFLICT (org_id, name) DO NOTHING;

-- =============================================================================
-- 11. CLIENTES
-- =============================================================================
INSERT INTO customers (id, org_id, name, tax_id, email, phone, address, status)
VALUES
  ('50000001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'Constructora XYZ SRL', '1111222233',
   'sistemas@construxyz.bo', '+591 3-3234567',
   'Av. Banzer Km 5, Parque Industrial', 'active'),

  ('50000001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   'Consultora Digital ABC', '2222333344',
   'ti@consultoraabc.bo', '+591 2-2234567',
   'Sopocachi, Calle 6 de Agosto N°2455', 'active'),

  ('50000001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
   'Universidad del Sur', '3333444455',
   'adquisiciones@unisur.edu.bo', '+591 4-4234567',
   'Campus Universitario, Av. Circunvalación', 'active'),

  ('50000001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001',
   'Gobierno Municipal SCZ', '4444555566',
   'it.municipal@gmscz.gob.bo', '+591 3-3345678',
   'Plaza 24 de Septiembre, Palacio Municipal', 'active'),

  ('50000001-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001',
   'Clínica Santa María', '5555666677',
   'sistemas@clinicasantamaria.bo', '+591 3-3456789',
   'Av. Cristo Redentor N°1234, 3er Anillo', 'active')
ON CONFLICT (org_id, name) DO NOTHING;

-- =============================================================================
-- 12. PRODUCTOS
-- =============================================================================
INSERT INTO products (id, org_id, sku, name, category, description, sale_price, cost_price, unit, status)
VALUES
  -- Laptops
  ('51000001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'LAP-HP-001', 'Laptop HP 15.6" Intel Core i5', 'Laptops',
   'Procesador Intel Core i5-1235U, RAM 8GB, SSD 512GB, Windows 11',
   6500.00, 4800.00, 'unidad', 'active'),

  ('51000001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   'LAP-LNV-001', 'Laptop Lenovo ThinkPad 14" i7', 'Laptops',
   'Intel Core i7-1265U, RAM 16GB, SSD 1TB, Windows 11 Pro',
   12500.00, 9200.00, 'unidad', 'active'),

  ('51000001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
   'LAP-ASS-001', 'Laptop ASUS VivoBook 15" i3', 'Laptops',
   'Intel Core i3-1215U, RAM 8GB, SSD 256GB',
   4200.00, 3100.00, 'unidad', 'active'),

  -- Monitores
  ('51000001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001',
   'MON-LG-001', 'Monitor LG 24" Full HD IPS', 'Monitores',
   'Panel IPS 24", 1920x1080, 75Hz, HDMI + VGA',
   1450.00, 1050.00, 'unidad', 'active'),

  ('51000001-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001',
   'MON-SAM-001', 'Monitor Samsung 27" QHD Curvo', 'Monitores',
   'Panel VA 27" curvo, 2560x1440, 165Hz, DisplayPort',
   2800.00, 2050.00, 'unidad', 'active'),

  -- Periféricos
  ('51000001-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001',
   'MOU-LOG-001', 'Mouse Inalámbrico Logitech MX Master 3', 'Periféricos',
   'Ergonómico, receptor USB nano, batería recargable, 4000 DPI',
   420.00, 290.00, 'unidad', 'active'),

  ('51000001-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001',
   'TEC-LOG-001', 'Teclado Mecánico Logitech G413', 'Periféricos',
   'Switches táctiles, retroiluminación roja, anti-ghosting',
   550.00, 380.00, 'unidad', 'active'),

  ('51000001-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001',
   'AUR-SON-001', 'Auriculares Sony WH-1000XM5', 'Periféricos',
   'Cancelación de ruido activa, 30h batería, Bluetooth 5.2',
   1800.00, 1320.00, 'unidad', 'active'),

  -- Accesorios
  ('51000001-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000001',
   'WEB-LOG-001', 'Webcam Logitech C920 Full HD', 'Accesorios',
   '1080p/30fps, micrófono estéreo integrado, autofoco',
   480.00, 330.00, 'unidad', 'active'),

  ('51000001-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000001',
   'HUB-USB-001', 'Hub USB-C 7-en-1 Anker', 'Accesorios',
   'HDMI 4K, 3xUSB 3.0, SD/microSD, USB-C PD 85W',
   350.00, 220.00, 'unidad', 'active'),

  -- Cables
  ('51000001-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000001',
   'CAB-HDM-001', 'Cable HDMI 2.0 Premium 2m', 'Cables',
   'Soporta 4K@60Hz, HDR, blindado, conectores dorados',
   85.00, 42.00, 'unidad', 'active'),

  ('51000001-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000001',
   'CAB-UCA-001', 'Cable USB-C a USB-A 1m Trenzado', 'Cables',
   'Carga rápida 60W, transferencia 5Gbps, nylon trenzado',
   65.00, 30.00, 'unidad', 'active'),

  -- Componentes
  ('51000001-0000-0000-0000-000000000013', '11111111-0000-0000-0000-000000000001',
   'SSD-SAM-001', 'SSD Samsung 870 EVO 1TB', 'Componentes',
   'SATA III, velocidad lectura 560MB/s, escritura 530MB/s',
   750.00, 560.00, 'unidad', 'active'),

  ('51000001-0000-0000-0000-000000000014', '11111111-0000-0000-0000-000000000001',
   'RAM-KNG-001', 'Memoria RAM DDR4 16GB 3200MHz Kingston', 'Componentes',
   'CL16, compatible con Intel y AMD, kit de 2x8GB',
   520.00, 380.00, 'unidad', 'active'),

  -- Mobiliario/Otros
  ('51000001-0000-0000-0000-000000000015', '11111111-0000-0000-0000-000000000001',
   'MOC-SAM-001', 'Mochila Laptop 15.6" Samsonite', 'Accesorios',
   'Compartimento acolchado, puerto USB externo, 25 litros',
   280.00, 170.00, 'unidad', 'active')
ON CONFLICT (org_id, sku) DO NOTHING;

-- =============================================================================
-- 13. INVENTARIO INICIAL (ambas sucursales)
-- =============================================================================
-- Sucursal Central (SCZ) - stock más alto
INSERT INTO inventory_stock (id, org_id, branch_id, product_id, quantity_on_hand, min_stock)
VALUES
  ('52000001-0001-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000001', 12, 5),
  ('52000001-0001-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000002', 5,  2),
  ('52000001-0001-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000003', 8,  3),
  ('52000001-0001-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000004', 15, 5),
  ('52000001-0001-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000005', 4,  3),
  ('52000001-0001-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000006', 20, 8),
  ('52000001-0001-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000007', 18, 5),
  ('52000001-0001-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000008', 6,  3),
  ('52000001-0001-0000-0000-000000000009', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000009', 10, 4),
  ('52000001-0001-0000-0000-000000000010', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000010', 25, 10),
  ('52000001-0001-0000-0000-000000000011', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000011', 40, 15),
  ('52000001-0001-0000-0000-000000000012', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000012', 50, 20),
  ('52000001-0001-0000-0000-000000000013', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000013', 7,  3),
  ('52000001-0001-0000-0000-000000000014', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000014', 9,  4),
  ('52000001-0001-0000-0000-000000000015', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000015', 15, 6)
ON CONFLICT (branch_id, product_id) DO UPDATE
  SET quantity_on_hand = EXCLUDED.quantity_on_hand,
      min_stock = EXCLUDED.min_stock;

-- Sucursal Norte (LPZ) - stock moderado
INSERT INTO inventory_stock (id, org_id, branch_id, product_id, quantity_on_hand, min_stock)
VALUES
  ('53000001-0001-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000001', 6,  3),
  ('53000001-0001-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000002', 2,  2),
  ('53000001-0001-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000003', 4,  2),
  ('53000001-0001-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000004', 8,  4),
  ('53000001-0001-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000005', 1,  2),
  ('53000001-0001-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000006', 12, 5),
  ('53000001-0001-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000007', 10, 4),
  ('53000001-0001-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000008', 3,  2),
  ('53000001-0001-0000-0000-000000000009', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000009', 5,  3),
  ('53000001-0001-0000-0000-000000000010', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000010', 15, 6),
  ('53000001-0001-0000-0000-000000000011', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000011', 20, 8),
  ('53000001-0001-0000-0000-000000000012', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000012', 30, 10),
  ('53000001-0001-0000-0000-000000000013', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000013', 4,  2),
  ('53000001-0001-0000-0000-000000000014', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000014', 5,  3),
  ('53000001-0001-0000-0000-000000000015', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000015', 8,  4)
ON CONFLICT (branch_id, product_id) DO UPDATE
  SET quantity_on_hand = EXCLUDED.quantity_on_hand,
      min_stock = EXCLUDED.min_stock;

-- =============================================================================
-- 14. ÓRDENES DE COMPRA
-- =============================================================================
-- OC-001: Recibida en Sucursal Central
INSERT INTO purchase_orders (id, org_id, branch_id, supplier_id, order_number, status,
  ordered_at, received_at, subtotal, discount_total, tax_total, total_cost, notes)
VALUES (
  '54000001-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  '4f000001-0000-0000-0000-000000000001',
  'OC-2025-001', 'received',
  NOW() - INTERVAL '30 days', NOW() - INTERVAL '25 days',
  69600.00, 0, 9048.00, 78648.00,
  'Reposición trimestral de laptops'
) ON CONFLICT (org_id, order_number) DO NOTHING;

INSERT INTO purchase_order_items (id, org_id, purchase_order_id, product_id, quantity, unit_cost, total_cost)
VALUES
  ('55000001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000001', 10, 4800.00, 48000.00),
  ('55000001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000002', 3, 9200.00, 27600.00)
ON CONFLICT (purchase_order_id, product_id) DO NOTHING;

-- OC-002: Recibida en Sucursal Norte
INSERT INTO purchase_orders (id, org_id, branch_id, supplier_id, order_number, status,
  ordered_at, received_at, subtotal, discount_total, tax_total, total_cost, notes)
VALUES (
  '54000001-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002',
  '4f000001-0000-0000-0000-000000000002',
  'OC-2025-002', 'received',
  NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days',
  15400.00, 0, 2002.00, 17402.00,
  'Accesorios y periféricos para La Paz'
) ON CONFLICT (org_id, order_number) DO NOTHING;

INSERT INTO purchase_order_items (id, org_id, purchase_order_id, product_id, quantity, unit_cost, total_cost)
VALUES
  ('55000001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000006', 20, 290.00, 5800.00),
  ('55000001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000007', 15, 380.00, 5700.00),
  ('55000001-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000010', 10, 220.00, 2200.00),
  ('55000001-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000015', 5, 170.00, 850.00),
  ('55000001-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000012', 28, 30.00, 840.00)
ON CONFLICT (purchase_order_id, product_id) DO NOTHING;

-- OC-003: Aprobada (en camino)
INSERT INTO purchase_orders (id, org_id, branch_id, supplier_id, order_number, status,
  ordered_at, subtotal, discount_total, tax_total, total_cost, notes)
VALUES (
  '54000001-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  '4f000001-0000-0000-0000-000000000003',
  'OC-2025-003', 'approved',
  NOW() - INTERVAL '5 days',
  13400.00, 0, 1742.00, 15142.00,
  'Componentes para reparaciones'
) ON CONFLICT (org_id, order_number) DO NOTHING;

INSERT INTO purchase_order_items (id, org_id, purchase_order_id, product_id, quantity, unit_cost, total_cost)
VALUES
  ('55000001-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000003', '51000001-0000-0000-0000-000000000013', 10, 560.00, 5600.00),
  ('55000001-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000003', '51000001-0000-0000-0000-000000000014', 10, 380.00, 3800.00),
  ('55000001-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000003', '51000001-0000-0000-0000-000000000004', 4, 1050.00, 4200.00)
ON CONFLICT (purchase_order_id, product_id) DO NOTHING;

-- OC-004: Pendiente
INSERT INTO purchase_orders (id, org_id, branch_id, supplier_id, order_number, status,
  subtotal, discount_total, tax_total, total_cost, notes)
VALUES (
  '54000001-0000-0000-0000-000000000004',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002',
  '4f000001-0000-0000-0000-000000000004',
  'OC-2025-004', 'pending',
  11040.00, 0, 1435.20, 12475.20,
  'Reponer stock de auriculares y webcams La Paz'
) ON CONFLICT (org_id, order_number) DO NOTHING;

INSERT INTO purchase_order_items (id, org_id, purchase_order_id, product_id, quantity, unit_cost, total_cost)
VALUES
  ('55000001-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000004', '51000001-0000-0000-0000-000000000008', 5, 1320.00, 6600.00),
  ('55000001-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000004', '51000001-0000-0000-0000-000000000009', 8, 330.00, 2640.00),
  ('55000001-0000-0000-0000-000000000013', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000004', '51000001-0000-0000-0000-000000000005', 1, 2050.00, 2050.00)
ON CONFLICT (purchase_order_id, product_id) DO NOTHING;

-- OC-005: Borrador
INSERT INTO purchase_orders (id, org_id, branch_id, supplier_id, order_number, status,
  subtotal, discount_total, tax_total, total_cost, notes)
VALUES (
  '54000001-0000-0000-0000-000000000005',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  '4f000001-0000-0000-0000-000000000001',
  'OC-2025-005', 'draft',
  4760.00, 0, 618.80, 5378.80,
  'Borrador - pendiente de aprobación gerencia'
) ON CONFLICT (org_id, order_number) DO NOTHING;

INSERT INTO purchase_order_items (id, org_id, purchase_order_id, product_id, quantity, unit_cost, total_cost)
VALUES
  ('55000001-0000-0000-0000-000000000014', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000005', '51000001-0000-0000-0000-000000000003', 1, 3100.00, 3100.00),
  ('55000001-0000-0000-0000-000000000015', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000005', '51000001-0000-0000-0000-000000000011', 8, 42.00, 336.00),
  ('55000001-0000-0000-0000-000000000016', '11111111-0000-0000-0000-000000000001', '54000001-0000-0000-0000-000000000005', '51000001-0000-0000-0000-000000000012', 22, 30.00, 660.00)
ON CONFLICT (purchase_order_id, product_id) DO NOTHING;

-- =============================================================================
-- 15. COTIZACIONES
-- =============================================================================
-- COT-001: Convertida en venta (cliente Constructora XYZ)
INSERT INTO quotes (id, org_id, branch_id, customer_id, quote_number, status,
  valid_until, subtotal, discount_total, tax_total, total, notes,
  client_name, client_email, client_phone, client_nit)
VALUES (
  '56000001-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  '50000001-0000-0000-0000-000000000001',
  'COT-2025-001', 'converted',
  CURRENT_DATE + 15,
  36000.00, 1800.00, 4446.00, 38646.00,
  'Equipamiento de nuevas oficinas administrativas',
  'Constructora XYZ SRL', 'sistemas@construxyz.bo', '+591 3-3234567', '1111222233'
) ON CONFLICT (org_id, quote_number) DO NOTHING;

INSERT INTO quote_items (id, org_id, quote_id, product_id, quantity, unit_price, discount, total)
VALUES
  ('57000001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000001', 4, 6500.00, 130.00, 25870.00),
  ('57000001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000004', 6, 1450.00, 290.00, 8410.00)
ON CONFLICT (quote_id, product_id) DO NOTHING;

-- COT-002: Aceptada (esperando pago)
INSERT INTO quotes (id, org_id, branch_id, customer_id, quote_number, status,
  valid_until, subtotal, discount_total, tax_total, total,
  client_name, client_email, client_phone)
VALUES (
  '56000001-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  '50000001-0000-0000-0000-000000000002',
  'COT-2025-002', 'accepted',
  CURRENT_DATE + 10,
  30150.00, 0, 3919.50, 34069.50,
  'Consultora Digital ABC', 'ti@consultoraabc.bo', '+591 2-2234567'
) ON CONFLICT (org_id, quote_number) DO NOTHING;

INSERT INTO quote_items (id, org_id, quote_id, product_id, quantity, unit_price, discount, total)
VALUES
  ('57000001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000002', 2, 12500.00, 0, 25000.00),
  ('57000001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000005', 1, 2800.00, 0, 2800.00),
  ('57000001-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000008', 1, 1800.00, 0, 1800.00),
  ('57000001-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000006', 1, 420.00, 0, 420.00)
ON CONFLICT (quote_id, product_id) DO NOTHING;

-- COT-003: Enviada (respuesta pendiente) - Universidad del Sur
INSERT INTO quotes (id, org_id, branch_id, customer_id, quote_number, status,
  valid_until, subtotal, discount_total, tax_total, total, notes,
  client_name, client_email, client_nit)
VALUES (
  '56000001-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  '50000001-0000-0000-0000-000000000003',
  'COT-2025-003', 'sent',
  CURRENT_DATE + 20,
  163500.00, 8175.00, 20216.25, 175541.25,
  'Laboratorio de informática - 20 equipos completos',
  'Universidad del Sur', 'adquisiciones@unisur.edu.bo', '3333444455'
) ON CONFLICT (org_id, quote_number) DO NOTHING;

INSERT INTO quote_items (id, org_id, quote_id, product_id, quantity, unit_price, discount, total)
VALUES
  ('57000001-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000003', '51000001-0000-0000-0000-000000000001', 20, 6500.00, 650.00, 129350.00),
  ('57000001-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000003', '51000001-0000-0000-0000-000000000006', 20, 420.00, 42.00, 7958.00),
  ('57000001-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000003', '51000001-0000-0000-0000-000000000007', 20, 550.00, 55.00, 10945.00),
  ('57000001-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000003', '51000001-0000-0000-0000-000000000009', 20, 480.00, 48.00, 9552.00),
  ('57000001-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000003', '51000001-0000-0000-0000-000000000011', 20, 85.00, 8.50, 1691.00)
ON CONFLICT (quote_id, product_id) DO NOTHING;

-- COT-004: Enviada - Gobierno Municipal
INSERT INTO quotes (id, org_id, branch_id, customer_id, quote_number, status,
  valid_until, subtotal, discount_total, tax_total, total,
  client_name, client_email, client_nit)
VALUES (
  '56000001-0000-0000-0000-000000000004',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002',
  '50000001-0000-0000-0000-000000000004',
  'COT-2025-004', 'sent',
  CURRENT_DATE + 30,
  47500.00, 2375.00, 5868.75, 50993.75,
  'Gobierno Municipal SCZ', 'it.municipal@gmscz.gob.bo', '4444555566'
) ON CONFLICT (org_id, quote_number) DO NOTHING;

INSERT INTO quote_items (id, org_id, quote_id, product_id, quantity, unit_price, discount, total)
VALUES
  ('57000001-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000004', '51000001-0000-0000-0000-000000000001', 5, 6500.00, 325.00, 32175.00),
  ('57000001-0000-0000-0000-000000000013', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000004', '51000001-0000-0000-0000-000000000004', 5, 1450.00, 72.50, 7177.50),
  ('57000001-0000-0000-0000-000000000014', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000004', '51000001-0000-0000-0000-000000000010', 10, 350.00, 17.50, 3482.50)
ON CONFLICT (quote_id, product_id) DO NOTHING;

-- COT-005: Rechazada
INSERT INTO quotes (id, org_id, branch_id, quote_number, status,
  valid_until, subtotal, discount_total, tax_total, total,
  client_name, client_email)
VALUES (
  '56000001-0000-0000-0000-000000000005',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  'COT-2025-005', 'rejected',
  CURRENT_DATE - 5,
  13250.00, 0, 1722.50, 14972.50,
  'Pedro Sanchez', 'pedro.sanchez@gmail.com'
) ON CONFLICT (org_id, quote_number) DO NOTHING;

INSERT INTO quote_items (id, org_id, quote_id, product_id, quantity, unit_price, discount, total)
VALUES
  ('57000001-0000-0000-0000-000000000015', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000005', '51000001-0000-0000-0000-000000000002', 1, 12500.00, 0, 12500.00),
  ('57000001-0000-0000-0000-000000000016', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000005', '51000001-0000-0000-0000-000000000008', 1, 1800.00, 0, 1800.00)
ON CONFLICT (quote_id, product_id) DO NOTHING;

-- COT-006: Expirada
INSERT INTO quotes (id, org_id, branch_id, quote_number, status,
  valid_until, subtotal, discount_total, tax_total, total,
  client_name, client_phone)
VALUES (
  '56000001-0000-0000-0000-000000000006',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002',
  'COT-2025-006', 'expired',
  CURRENT_DATE - 15,
  6950.00, 0, 903.50, 7853.50,
  'Luis Fernández', '+591 71234567'
) ON CONFLICT (org_id, quote_number) DO NOTHING;

INSERT INTO quote_items (id, org_id, quote_id, product_id, quantity, unit_price, discount, total)
VALUES
  ('57000001-0000-0000-0000-000000000017', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000006', '51000001-0000-0000-0000-000000000001', 1, 6500.00, 0, 6500.00),
  ('57000001-0000-0000-0000-000000000018', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000006', '51000001-0000-0000-0000-000000000011', 4, 85.00, 0, 340.00)
ON CONFLICT (quote_id, product_id) DO NOTHING;

-- COT-007 y 008: Pendientes nuevas
INSERT INTO quotes (id, org_id, branch_id, quote_number, status,
  valid_until, subtotal, discount_total, tax_total, total,
  client_name, client_email, client_phone)
VALUES
  (
    '56000001-0000-0000-0000-000000000007',
    '11111111-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001',
    'COT-2025-007', 'pending',
    CURRENT_DATE + 15,
    4200.00, 0, 546.00, 4746.00,
    'Carla Medina', 'carla.medina@email.com', '+591 70098765'
  ),
  (
    '56000001-0000-0000-0000-000000000008',
    '11111111-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000002',
    'COT-2025-008', 'sent',
    CURRENT_DATE + 10,
    5880.00, 0, 764.40, 6644.40,
    'Clínica Santa María', 'sistemas@clinicasantamaria.bo', '+591 3-3456789'
  )
ON CONFLICT (org_id, quote_number) DO NOTHING;

INSERT INTO quote_items (id, org_id, quote_id, product_id, quantity, unit_price, discount, total)
VALUES
  ('57000001-0000-0000-0000-000000000019', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000007', '51000001-0000-0000-0000-000000000003', 1, 4200.00, 0, 4200.00),
  ('57000001-0000-0000-0000-000000000020', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000008', '51000001-0000-0000-0000-000000000004', 4, 1450.00, 0, 5800.00),
  ('57000001-0000-0000-0000-000000000021', '11111111-0000-0000-0000-000000000001', '56000001-0000-0000-0000-000000000008', '51000001-0000-0000-0000-000000000009', 1, 480.00, 0, 480.00)
ON CONFLICT (quote_id, product_id) DO NOTHING;

-- =============================================================================
-- 16. VENTAS (10 ventas completadas)
-- =============================================================================
-- VTA-001: Venta desde COT-001 (Constructora XYZ)
INSERT INTO sales (id, org_id, branch_id, customer_id, quote_id, sale_number, status,
  sold_at, subtotal, discount_total, tax_total, total, cost_total,
  client_name, payment_method)
VALUES (
  '58000001-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  '50000001-0000-0000-0000-000000000001',
  '56000001-0000-0000-0000-000000000001',
  'VTA-2025-001', 'completed',
  NOW() - INTERVAL '25 days',
  36000.00, 1800.00, 4446.00, 38646.00, 26620.00,
  'Constructora XYZ SRL', 'other'
) ON CONFLICT (org_id, sale_number) DO NOTHING;

INSERT INTO sale_items (id, org_id, sale_id, product_id, quantity, unit_price, unit_cost, discount, total, total_cost)
VALUES
  ('59000001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000001', 4, 6500.00, 4800.00, 130.00, 25870.00, 19200.00),
  ('59000001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000004', 6, 1450.00, 1050.00, 290.00, 8410.00, 6300.00)
ON CONFLICT (sale_id, product_id) DO NOTHING;

INSERT INTO payments (id, org_id, sale_id, amount, method, status, paid_at)
VALUES ('5a000001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000001', 38646.00, 'other', 'completed', NOW() - INTERVAL '24 days')
ON CONFLICT DO NOTHING;

-- VTA-002: Venta directa - cliente retail
INSERT INTO sales (id, org_id, branch_id, sale_number, status,
  sold_at, subtotal, discount_total, tax_total, total, cost_total,
  client_name, payment_method)
VALUES (
  '58000001-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  'VTA-2025-002', 'completed',
  NOW() - INTERVAL '22 days',
  7370.00, 0, 958.10, 8328.10, 5470.00,
  'Marco Antonio Pérez', 'cash'
) ON CONFLICT (org_id, sale_number) DO NOTHING;

INSERT INTO sale_items (id, org_id, sale_id, product_id, quantity, unit_price, unit_cost, discount, total, total_cost)
VALUES
  ('59000001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000001', 1, 6500.00, 4800.00, 0, 6500.00, 4800.00),
  ('59000001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000002', '51000001-0000-0000-0000-000000000006', 2, 420.00, 290.00, 0, 840.00, 580.00)
ON CONFLICT (sale_id, product_id) DO NOTHING;

INSERT INTO payments (id, org_id, sale_id, amount, method, status, paid_at)
VALUES ('5a000001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000002', 8328.10, 'cash', 'completed', NOW() - INTERVAL '22 days')
ON CONFLICT DO NOTHING;

-- VTA-003: Sucursal Norte - pago con tarjeta
INSERT INTO sales (id, org_id, branch_id, customer_id, sale_number, status,
  sold_at, subtotal, discount_total, tax_total, total, cost_total,
  client_name, payment_method)
VALUES (
  '58000001-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002',
  '50000001-0000-0000-0000-000000000005',
  'VTA-2025-003', 'completed',
  NOW() - INTERVAL '18 days',
  9800.00, 0, 1274.00, 11074.00, 7260.00,
  'Clínica Santa María', 'card'
) ON CONFLICT (org_id, sale_number) DO NOTHING;

INSERT INTO sale_items (id, org_id, sale_id, product_id, quantity, unit_price, unit_cost, discount, total, total_cost)
VALUES
  ('59000001-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000003', '51000001-0000-0000-0000-000000000004', 4, 1450.00, 1050.00, 0, 5800.00, 4200.00),
  ('59000001-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000003', '51000001-0000-0000-0000-000000000008', 2, 1800.00, 1320.00, 0, 3600.00, 2640.00),
  ('59000001-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000003', '51000001-0000-0000-0000-000000000010', 1, 350.00, 220.00, 0, 350.00, 220.00)
ON CONFLICT (sale_id, product_id) DO NOTHING;

INSERT INTO payments (id, org_id, sale_id, amount, method, status, paid_at)
VALUES ('5a000001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000003', 11074.00, 'card', 'completed', NOW() - INTERVAL '18 days')
ON CONFLICT DO NOTHING;

-- VTA-004 a VTA-010: ventas adicionales variadas
INSERT INTO sales (id, org_id, branch_id, sale_number, status,
  sold_at, subtotal, discount_total, tax_total, total, cost_total,
  client_name, payment_method)
VALUES
  ('58000001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'VTA-2025-004', 'completed', NOW() - INTERVAL '15 days', 2600.00, 0, 338.00, 2938.00, 1840.00, 'Sofía Gutiérrez', 'cash'),
  ('58000001-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'VTA-2025-005', 'completed', NOW() - INTERVAL '12 days', 7340.00, 0, 954.20, 8294.20, 5380.00, 'Carlos Ramos', 'other'),
  ('58000001-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'VTA-2025-006', 'completed', NOW() - INTERVAL '10 days', 13900.00, 695.00, 1717.75, 14922.75, 10050.00, 'Empresa Torres SRL', 'other'),
  ('58000001-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'VTA-2025-007', 'completed', NOW() - INTERVAL '7 days', 550.00, 0, 71.50, 621.50, 380.00, 'Ana Beatriz Castro', 'cash'),
  ('58000001-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'VTA-2025-008', 'completed', NOW() - INTERVAL '5 days', 4420.00, 0, 574.60, 4994.60, 3170.00, 'Hugo Molina', 'card'),
  ('58000001-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', 'VTA-2025-009', 'completed', NOW() - INTERVAL '3 days', 6500.00, 325.00, 802.75, 6977.75, 4800.00, 'Laura Salinas', 'cash'),
  ('58000001-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'VTA-2025-010', 'completed', NOW() - INTERVAL '1 day',  1270.00, 0, 165.10, 1435.10, 820.00, 'Venta mostrador', 'cash')
ON CONFLICT (org_id, sale_number) DO NOTHING;

-- Items de ventas 4-10 (simplificados)
INSERT INTO sale_items (id, org_id, sale_id, product_id, quantity, unit_price, unit_cost, discount, total, total_cost)
VALUES
  ('59000001-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000004', '51000001-0000-0000-0000-000000000003', 1, 4200.00, 3100.00, 0, 4200.00, 3100.00),
  ('59000001-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000005', '51000001-0000-0000-0000-000000000001', 1, 6500.00, 4800.00, 0, 6500.00, 4800.00),
  ('59000001-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000006', '51000001-0000-0000-0000-000000000002', 1, 12500.00, 9200.00, 625.00, 11875.00, 9200.00),
  ('59000001-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000007', '51000001-0000-0000-0000-000000000007', 1, 550.00, 380.00, 0, 550.00, 380.00),
  ('59000001-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000008', '51000001-0000-0000-0000-000000000003', 1, 4200.00, 3100.00, 0, 4200.00, 3100.00),
  ('59000001-0000-0000-0000-000000000013', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000009', '51000001-0000-0000-0000-000000000001', 1, 6500.00, 4800.00, 325.00, 6175.00, 4800.00),
  ('59000001-0000-0000-0000-000000000014', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000010', '51000001-0000-0000-0000-000000000006', 2, 420.00, 290.00, 0, 840.00, 580.00),
  ('59000001-0000-0000-0000-000000000015', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000010', '51000001-0000-0000-0000-000000000012', 5, 65.00, 30.00, 0, 325.00, 150.00)
ON CONFLICT (sale_id, product_id) DO NOTHING;

-- Pagos de ventas 4-10
INSERT INTO payments (id, org_id, sale_id, amount, method, status, paid_at)
VALUES
  ('5a000001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000004', 2938.00,  'cash',     'completed', NOW() - INTERVAL '15 days'),
  ('5a000001-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000005', 8294.20,  'other', 'completed', NOW() - INTERVAL '12 days'),
  ('5a000001-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000006', 14922.75, 'other', 'completed', NOW() - INTERVAL '10 days'),
  ('5a000001-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000007', 621.50,   'cash',     'completed', NOW() - INTERVAL '7 days'),
  ('5a000001-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000008', 4994.60,  'card',     'completed', NOW() - INTERVAL '5 days'),
  ('5a000001-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000009', 6977.75,  'cash',     'completed', NOW() - INTERVAL '3 days'),
  ('5a000001-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000001', '58000001-0000-0000-0000-000000000010', 1435.10,  'cash',     'completed', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 17. MOVIMIENTOS DE INVENTARIO (trazabilidad)
-- =============================================================================
-- Entradas por OC-001 (recibida)
INSERT INTO inventory_movements (id, org_id, branch_id, product_id, movement_type, quantity, unit_cost, total_cost, reference_type, reference_id)
VALUES
  ('5b000001-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000001', 'purchase', 10, 4800.00, 48000.00, 'purchase_order', '54000001-0000-0000-0000-000000000001'),
  ('5b000001-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000002', 'purchase', 3, 9200.00, 27600.00, 'purchase_order', '54000001-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Salidas por VTA-001
INSERT INTO inventory_movements (id, org_id, branch_id, product_id, movement_type, quantity, unit_cost, total_cost, reference_type, reference_id)
VALUES
  ('5b000001-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000001', 'sale', 4, 4800.00, 19200.00, 'sale', '58000001-0000-0000-0000-000000000001'),
  ('5b000001-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '51000001-0000-0000-0000-000000000004', 'sale', 6, 1050.00, 6300.00, 'sale', '58000001-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 18. CAJA CHICA (transacciones demo)
-- =============================================================================
INSERT INTO petty_cash_transactions
  (id, org_id, branch_id, type, amount, description, category, reference, created_by)
VALUES
  (
    '5c000001-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001',
    'income', 5000.00,
    'Apertura de caja chica del mes',
    'Fondo Inicial', NULL,
    (SELECT id FROM users WHERE email = 'gerente@tecnologiaandina.bo')
  ),
  (
    '5c000001-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001',
    'expense', 250.00,
    'Compra de hojas y toner para impresora',
    'Papelería', 'FAC-12345',
    (SELECT id FROM users WHERE email = 'admin@tecnologiaandina.bo')
  ),
  (
    '5c000001-0000-0000-0000-000000000003',
    '11111111-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001',
    'expense', 180.00,
    'Productos de limpieza oficina',
    'Limpieza', 'REC-0023',
    (SELECT id FROM users WHERE email = 'admin@tecnologiaandina.bo')
  ),
  (
    '5c000001-0000-0000-0000-000000000004',
    '11111111-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001',
    'expense', 350.00,
    'Envío de paquetes a sucursal Norte',
    'Transporte', 'GRT-00789',
    (SELECT id FROM users WHERE email = 'almacen@tecnologiaandina.bo')
  ),
  (
    '5c000001-0000-0000-0000-000000000005',
    '11111111-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001',
    'income', 1000.00,
    'Recarga de fondo caja chica',
    'Fondo Inicial', NULL,
    (SELECT id FROM users WHERE email = 'gerente@tecnologiaandina.bo')
  ),
  (
    '5c000001-0000-0000-0000-000000000006',
    '11111111-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001',
    'expense', 420.00,
    'Refrigerio para reunión con clientes',
    'Otros', NULL,
    (SELECT id FROM users WHERE email = 'admin@tecnologiaandina.bo')
  ),
  (
    '5c000001-0000-0000-0000-000000000007',
    '11111111-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000002',
    'income', 3000.00,
    'Fondo inicial sucursal Norte',
    'Fondo Inicial', NULL,
    (SELECT id FROM users WHERE email = 'gerente@tecnologiaandina.bo')
  ),
  (
    '5c000001-0000-0000-0000-000000000008',
    '11111111-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000002',
    'expense', 120.00,
    'Taxis para visitas a clientes La Paz',
    'Transporte', NULL,
    (SELECT id FROM users WHERE email = 'vendedor1@tecnologiaandina.bo')
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- RESUMEN
-- =============================================================================
-- Empresa:  Tecnología Andina SRL
-- Tenant ID (x-tenant-id): 11111111-0000-0000-0000-000000000001
--
-- USUARIOS:
--   gerente@tecnologiaandina.bo  / Password123!  → Gerente (acceso total)
--   admin@tecnologiaandina.bo    / Password123!  → Administrador
--   vendedor1@tecnologiaandina.bo / Password123! → Vendedor
--   vendedor2@tecnologiaandina.bo / Password123! → Vendedor
--   almacen@tecnologiaandina.bo  / Password123!  → Almacenero
--
-- DATOS CREADOS:
--   2 sucursales, 5 proveedores, 5 clientes, 15 productos
--   5 órdenes de compra (1 draft, 1 pendiente, 1 aprobada, 2 recibidas)
--   8 cotizaciones (1 convertida, 1 aceptada, 2 enviadas, 1 rechazada, 1 expirada, 2 pendientes)
--   10 ventas completadas con pagos
--   Stock inicial en ambas sucursales
-- =============================================================================

COMMIT;

