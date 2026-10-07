-- =============================================================================
-- 018: Sucursal asignada por miembro + permiso para ver todas las sucursales
--   - org_members.branch_id: sucursal a la que pertenece el usuario.
--   - branches.view_all: permite cambiar/ver cualquier sucursal (admins).
--     Sin este permiso, el usuario queda bloqueado a su sucursal asignada.
-- =============================================================================

BEGIN;

ALTER TABLE org_members ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id);

INSERT INTO permissions (code, description) VALUES
  ('branches.view_all', 'Ver y cambiar entre todas las sucursales')
ON CONFLICT (code) DO NOTHING;

-- Otorgar a los roles de sistema Gerente y Administrador de cada org
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.is_system = true
  AND r.name IN ('Gerente', 'Administrador')
  AND p.code = 'branches.view_all'
ON CONFLICT DO NOTHING;

COMMIT;
