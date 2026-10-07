-- =============================================================================
-- 031: Horario laboral, NIT/CI de miembro y datos de tienda
--
-- 1. org_work_schedules: una fila por organizacion. Nace enabled = false para
--    que la migracion no deje a nadie fuera del sistema al aplicarse.
--
-- 2. org_members.tax_id, NO users.tax_id. La tabla users es global entre
--    organizaciones: un unico global sobre el CI filtraria informacion entre
--    tenants (dos empresas distintas descubririan que comparten un empleado, y
--    la segunda no podria darlo de alta). El unico va por organizacion.
--
-- 3. orgs.advance_sale_terms: el texto de condiciones que se imprime en el
--    comprobante de una venta adelantada. El campo del frontend ya existe desde
--    la Fase 1 (sale-receipt-dialog.tsx), solo faltaba de donde llenarlo.
--
-- 4. Correccion de zonas horarias: "Mi Empresa S.A." y "Mi Empresa 2" quedaron
--    en America/Mexico_City desde la plantilla v0.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Datos de tienda
-- ---------------------------------------------------------------------------
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS advance_sale_terms text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text;

-- Las tres organizaciones de demo se crearon con la zona de la plantilla v0.
-- "Tecnologia Andina SRL" ya tiene America/La_Paz y no se toca.
UPDATE orgs
SET timezone = 'America/La_Paz'
WHERE timezone = 'America/Mexico_City';

-- ---------------------------------------------------------------------------
-- 2. NIT/CI del miembro, unico dentro de la organizacion
-- ---------------------------------------------------------------------------
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS tax_id text;

-- Normalizacion previa, identica a la de clientes y proveedores.
UPDATE org_members
SET tax_id = NULLIF(upper(btrim(tax_id)), '')
WHERE tax_id IS DISTINCT FROM NULLIF(upper(btrim(tax_id)), '');

-- Pre-flight de deduplicacion: sin esto el CREATE UNIQUE INDEX aborta y toda
-- la migracion hace ROLLBACK (patron de 022_customers_integrity.sql).
WITH dups AS (
  SELECT id,
         row_number() OVER (PARTITION BY org_id, tax_id ORDER BY created_at, id) AS rn
  FROM org_members
  WHERE deleted_at IS NULL AND tax_id IS NOT NULL
)
UPDATE org_members m
SET tax_id = m.tax_id || '-DUP' || d.rn
FROM dups d
WHERE d.id = m.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS org_members_org_tax_id_unique
  ON org_members (org_id, tax_id)
  WHERE deleted_at IS NULL AND tax_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Horario laboral
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS org_work_schedules (
  org_id uuid PRIMARY KEY REFERENCES orgs(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  -- ISO-8601: 1 = lunes ... 7 = domingo. Coincide con EXTRACT(ISODOW).
  days smallint[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::smallint[],
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '18:00',
  -- Roles que pueden entrar fuera de horario ademas de la excepcion estructural.
  exempt_role_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_work_schedules_days_check
    CHECK (days <@ ARRAY[1,2,3,4,5,6,7]::smallint[] AND array_length(days, 1) > 0),
  -- Se permite start > end para turnos que cruzan la medianoche; la funcion lo
  -- resuelve. Lo que no se permite es un rango vacio.
  CONSTRAINT org_work_schedules_time_check CHECK (start_time <> end_time)
);

ALTER TABLE org_work_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_work_schedules_select ON org_work_schedules;
CREATE POLICY org_work_schedules_select ON org_work_schedules
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS org_work_schedules_insert ON org_work_schedules;
CREATE POLICY org_work_schedules_insert ON org_work_schedules
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS org_work_schedules_update ON org_work_schedules;
CREATE POLICY org_work_schedules_update ON org_work_schedules
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

/**
 * Decide si un usuario puede operar ahora mismo en una organizacion.
 *
 * La hora se calcula en Postgres con now() AT TIME ZONE o.timezone: no hace
 * falta instalar ninguna libreria de zonas horarias en Node, y la BD es la
 * unica fuente de la hora para todos los procesos.
 *
 * ESCAPE ESTRUCTURAL, no configurable: quien tiene settings.write nunca se
 * bloquea. Es lo que impide que un Gerente se deje a si mismo fuera del sistema
 * con el que tendria que arreglar el horario. No es una excepcion que alguien
 * pueda desactivar por error desde la pantalla.
 */
CREATE OR REPLACE FUNCTION app.is_within_work_schedule(p_org_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_schedule org_work_schedules%ROWTYPE;
  v_timezone text;
  v_now timestamp;
  v_dow smallint;
  v_time time;
BEGIN
  SELECT * INTO v_schedule FROM org_work_schedules WHERE org_id = p_org_id;

  -- Sin horario configurado o desactivado: no se bloquea a nadie.
  IF NOT FOUND OR NOT v_schedule.enabled THEN
    RETURN true;
  END IF;

  -- Escape estructural: settings.write siempre puede entrar.
  IF EXISTS (
    SELECT 1
    FROM org_members om
    JOIN user_roles ur ON ur.org_member_id = om.id
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE om.org_id = p_org_id
      AND om.user_id = p_user_id
      AND om.deleted_at IS NULL
      AND p.code = 'settings.write'
  ) THEN
    RETURN true;
  END IF;

  -- Roles exentos configurados desde la pantalla.
  IF array_length(v_schedule.exempt_role_ids, 1) IS NOT NULL AND EXISTS (
    SELECT 1
    FROM org_members om
    JOIN user_roles ur ON ur.org_member_id = om.id
    WHERE om.org_id = p_org_id
      AND om.user_id = p_user_id
      AND om.deleted_at IS NULL
      AND ur.role_id = ANY(v_schedule.exempt_role_ids)
  ) THEN
    RETURN true;
  END IF;

  SELECT o.timezone INTO v_timezone FROM orgs o WHERE o.id = p_org_id;
  v_now := now() AT TIME ZONE COALESCE(v_timezone, 'UTC');
  v_dow := EXTRACT(ISODOW FROM v_now)::smallint;
  v_time := v_now::time;

  IF NOT (v_dow = ANY(v_schedule.days)) THEN
    RETURN false;
  END IF;

  -- Turno normal (08:00-18:00) frente a turno que cruza la medianoche
  -- (22:00-06:00): en el segundo caso el rango valido es la union de los dos
  -- extremos del dia.
  IF v_schedule.start_time < v_schedule.end_time THEN
    RETURN v_time >= v_schedule.start_time AND v_time <= v_schedule.end_time;
  ELSE
    RETURN v_time >= v_schedule.start_time OR v_time <= v_schedule.end_time;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Permiso de la pantalla de horario
-- ---------------------------------------------------------------------------
INSERT INTO permissions (code, description) VALUES
  ('settings.schedule', 'Configurar el horario laboral de la organizacion')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.is_system = true AND r.name = 'Gerente'
  AND p.code = 'settings.schedule'
ON CONFLICT DO NOTHING;

-- Una fila por organizacion, desactivada. Asi la pantalla siempre encuentra algo
-- que editar y activar el horario es un solo interruptor.
INSERT INTO org_work_schedules (org_id)
SELECT id FROM orgs WHERE deleted_at IS NULL
ON CONFLICT (org_id) DO NOTHING;

COMMIT;
