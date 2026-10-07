-- =============================================================================
-- 025: Departamento / Estado del proveedor
-- Pais/Region ya existe como suppliers.location (006_add_frontend_fields).
-- Esto agrega el nivel intermedio (departamento boliviano, estado, provincia).
-- Los valores legacy de location tipo "Santa Cruz, Bolivia" no se migran
-- automaticamente: el usuario los separa al editar el proveedor.
-- =============================================================================

BEGIN;

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS state_region text;

COMMIT;
