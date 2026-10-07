-- =============================================================================
-- 030: Auditoria
--
-- La tabla audit_logs existe con RLS desde la 001, pero
--   grep -rn "audit_logs" src/  ->  0 resultados
-- Nunca se escribio ni se leyo: la pantalla de Auditoria es 100% mock.
--
-- Aqui se prepara la tabla (indices y permiso de lectura). Quien escribe es el
-- codigo: AuditService, llamado explicitamente DENTRO de la transaccion del
-- usecase.
--
-- Por que no un interceptor:
--   - un interceptor no conoce el valor ANTERIOR de un cambio de precio, que es
--     justamente lo que se quiere auditar;
--   - escribir fuera de la transaccion permitiria registrar la anulacion de una
--     venta que despues hizo ROLLBACK.
-- =============================================================================

BEGIN;

-- La consulta de la pantalla filtra por organizacion y ordena por fecha
-- descendente; sin este indice cada carga es un seq scan de toda la tabla.
CREATE INDEX IF NOT EXISTS audit_logs_org_created_idx
  ON audit_logs (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_org_action_created_idx
  ON audit_logs (org_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_entity_idx
  ON audit_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- El log solo se escribe y se lee: modificar o borrar un asiento vaciaria de
-- sentido la auditoria. Se revocan explicitamente UPDATE y DELETE por si algun
-- dia se agregara una politica permisiva por descuido.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS audit_logs_update ON audit_logs;
DROP POLICY IF EXISTS audit_logs_delete ON audit_logs;

INSERT INTO permissions (code, description) VALUES
  ('audit.read', 'Ver el historial de auditoria')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.is_system = true AND r.name IN ('Gerente', 'Administrador')
  AND p.code = 'audit.read'
ON CONFLICT DO NOTHING;

COMMIT;
