-- Los datos de la empresa se cargan una sola vez y luego quedan bloqueados.
BEGIN;

ALTER TABLE orgs ADD COLUMN IF NOT EXISTS profile_locked boolean NOT NULL DEFAULT false;

-- Las empresas que ya tienen datos de contacto cargados quedan bloqueadas.
UPDATE orgs
SET profile_locked = true
WHERE profile_locked = false
  AND (address IS NOT NULL OR phone IS NOT NULL OR email IS NOT NULL);

COMMIT;