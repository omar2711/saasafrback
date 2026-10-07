-- =============================================================================
-- 027: Autorizacion real
--
-- Hasta aqui @Permissions() y PermissionsGuard existian pero no se usaban en
-- ningun controller: cualquier usuario logueado y miembro de la organizacion
-- podia anular ventas, cambiar precios o gestionar roles con un curl.
--
-- Esta migracion NO activa nada por si sola (eso lo hace el codigo). Lo que
-- hace es reconciliar los permisos de los roles de sistema para que, al
-- empezar a exigirlos, nadie pierda algo que hoy usa desde la interfaz.
--
-- Ademas endurece app.is_org_member: un miembro suspendido seguia pasando el
-- filtro de RLS porque solo se miraba deleted_at.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Catalogo completo. Las migraciones anteriores fueron agregando permisos
--    sueltos; varias organizaciones creadas fuera del seed pueden no tenerlos.
-- ---------------------------------------------------------------------------
INSERT INTO permissions (code, description) VALUES
  ('suppliers.read',      'Ver proveedores'),
  ('suppliers.write',     'Crear/editar proveedores'),
  ('suppliers.delete',    'Eliminar proveedores'),
  ('products.read',       'Ver productos'),
  ('products.write',      'Crear/editar productos'),
  ('products.delete',     'Eliminar productos'),
  ('products.pricing',    'Gestionar precios por sucursal'),
  ('categories.write',    'Crear/editar categorias de productos'),
  ('inventory.read',      'Ver inventario y stock'),
  ('inventory.write',     'Ajustar stock y movimientos'),
  ('inventory.transfer',  'Crear, recibir y anular traspasos entre sucursales'),
  ('inventory.write_off', 'Registrar bajas de inventario por dano, merma o perdida'),
  ('purchases.read',      'Ver ordenes de compra'),
  ('purchases.write',     'Crear/editar ordenes de compra'),
  ('quotes.read',         'Ver cotizaciones'),
  ('quotes.write',        'Crear/editar cotizaciones'),
  ('quotes.convert',      'Convertir cotizacion a venta'),
  ('sales.read',          'Ver ventas'),
  ('sales.write',         'Crear/editar ventas'),
  ('sales.void',          'Anular ventas'),
  ('sales.deliver',       'Entregar ventas adelantadas (descuenta stock diferido)'),
  ('sales.return',        'Registrar y anular devoluciones parciales de ventas'),
  ('customers.read',      'Ver clientes'),
  ('customers.write',     'Crear/editar clientes'),
  ('customers.delete',    'Eliminar clientes'),
  ('petty_cash.read',     'Ver caja chica'),
  ('petty_cash.write',    'Registrar movimientos de caja chica'),
  ('reports.read',        'Ver reportes'),
  ('settings.read',       'Ver configuracion'),
  ('settings.write',      'Modificar configuracion'),
  ('users.read',          'Ver usuarios'),
  ('users.write',         'Crear/editar usuarios'),
  ('roles.manage',        'Gestionar roles y permisos de la organizacion'),
  ('branches.view_all',   'Ver y cambiar entre todas las sucursales'),
  ('kits.write',          'Crear/editar/eliminar kits (combos de productos)')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Reconciliacion por rol de sistema.
--
--    El criterio es "lo que el rol ya puede hacer hoy desde la interfaz". No se
--    quita ningun permiso: si un administrador se lo concedio a mano, se
--    respeta. Solo se agregan los que faltan.
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE system_role_grants (role_name text, permission_code text) ON COMMIT DROP;

-- GERENTE: acceso total.
INSERT INTO system_role_grants
SELECT 'Gerente', code FROM permissions;

-- ADMINISTRADOR: todo salvo anular ventas y modificar la configuracion.
INSERT INTO system_role_grants
SELECT 'Administrador', code FROM permissions
WHERE code NOT IN ('sales.void', 'settings.write');

-- VENDEDOR: el POS necesita leer productos, stock, kits y precios por sucursal,
-- ademas de cotizar, vender, entregar y devolver.
--   - products.read cubre tambien el catalogo de kits y el listado de precios
--     (pricing.controller expone GET con products.read).
--   - purchases.read entra porque la venta adelantada consulta
--     GET /purchases/orders/product-availability para reservar contra una OC.
--     Sin el, el flujo de venta adelantada dejaria de funcionar para el rol que
--     mas lo usa.
INSERT INTO system_role_grants (role_name, permission_code) VALUES
  ('Vendedor', 'products.read'),
  ('Vendedor', 'inventory.read'),
  ('Vendedor', 'purchases.read'),
  ('Vendedor', 'quotes.read'),
  ('Vendedor', 'quotes.write'),
  ('Vendedor', 'quotes.convert'),
  ('Vendedor', 'sales.read'),
  ('Vendedor', 'sales.write'),
  ('Vendedor', 'sales.deliver'),
  ('Vendedor', 'sales.return'),
  ('Vendedor', 'customers.read'),
  ('Vendedor', 'customers.write'),
  ('Vendedor', 'petty_cash.read');

-- ALMACENERO: inventario, compras, traspasos y bajas.
INSERT INTO system_role_grants (role_name, permission_code) VALUES
  ('Almacenero', 'products.read'),
  ('Almacenero', 'products.write'),
  ('Almacenero', 'categories.write'),
  ('Almacenero', 'inventory.read'),
  ('Almacenero', 'inventory.write'),
  ('Almacenero', 'inventory.transfer'),
  ('Almacenero', 'inventory.write_off'),
  ('Almacenero', 'suppliers.read'),
  ('Almacenero', 'purchases.read'),
  ('Almacenero', 'purchases.write'),
  ('Almacenero', 'kits.write');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM system_role_grants g
JOIN roles r ON r.is_system = true AND r.name = g.role_name
JOIN permissions p ON p.code = g.permission_code
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Roles a medida creados por los usuarios.
--
--    Un rol propio sin ningun permiso de lectura se queda con la aplicacion en
--    blanco en cuanto se empiece a exigir. Se les concede el minimo para que la
--    pantalla principal siga cargando; cualquier cosa que puedan escribir hoy
--    ya requiere un permiso que alguien les dio a mano.
-- ---------------------------------------------------------------------------
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.is_system = false
  AND p.code IN ('products.read', 'inventory.read', 'sales.read', 'customers.read')
  AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = r.id)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. app.is_org_member exige miembro ACTIVO.
--
--    TenantGuard ya filtraba por status = 'active', pero RLS no: un miembro
--    suspendido que consiguiera pasar el guard (o cualquier consulta hecha con
--    su contexto) seguia viendo las filas de la organizacion. Toda la cadena
--    can_manage_member / can_access_user cuelga de esta funcion.
-- ---------------------------------------------------------------------------
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
      AND om.status = 'active'
  );
$$;

COMMIT;
