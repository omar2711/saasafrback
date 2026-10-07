-- =============================================================================
-- 023: Bajas de inventario (dano / merma / perdida) y trazabilidad
--   - notes: motivo, obligatorio en bajas y salidas manuales
--   - created_by: quien registro el movimiento
--   - movement_type 'damage' (baja) y 'adjustment_out' (ajuste negativo)
-- El signo del movimiento lo define el tipo; quantity sigue siendo positiva,
-- porque el frontend ya deriva el signo del tipo en varios componentes.
-- =============================================================================

BEGIN;

ALTER TABLE inventory_movements ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE inventory_movements
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS inventory_movements_movement_type_check;
ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_movement_type_check
  CHECK (movement_type IN (
    'purchase', 'sale', 'transfer_in', 'transfer_out',
    'adjustment', 'adjustment_out', 'return', 'damage'
  ));

CREATE INDEX IF NOT EXISTS inventory_movements_org_type_created_idx
  ON inventory_movements (org_id, movement_type, created_at DESC);

INSERT INTO permissions (code, description) VALUES
  ('inventory.write_off', 'Registrar bajas de inventario por dano, merma o perdida')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.is_system = true AND r.name IN ('Gerente', 'Administrador', 'Almacenero')
  AND p.code = 'inventory.write_off'
ON CONFLICT DO NOTHING;

COMMIT;
