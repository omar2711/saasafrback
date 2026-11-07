-- Renombra el rol de sistema "Gerente" a "Propietario" en todas las organizaciones.
-- Los permisos se mantienen: están ligados al id del rol, no al nombre.
UPDATE roles r
SET name = 'Propietario'
WHERE r.is_system = true
  AND r.name = 'Gerente'
  AND NOT EXISTS (
    SELECT 1 FROM roles x
    WHERE x.org_id = r.org_id AND x.name = 'Propietario'
  );