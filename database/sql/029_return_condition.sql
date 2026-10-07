-- =============================================================================
-- 029: Condicion por linea en las devoluciones + numeracion segura
--
-- 1. sale_return_items.condition ('restock' | 'damaged') y notes.
--
--    Hoy toda devolucion repone stock, venga el producto en buen estado o roto.
--    Con 'damaged' se registran DOS movimientos: +return y -damage. Neto cero.
--
--    Se hace asi y no con un unico movimiento 'damage' porque
--    inventory_movements es un libro mayor: quantity_on_hand tiene que poder
--    reconstruirse sumando los movimientos, y la devolucion realmente ocurrio.
--    De propina, la pestana Bajas recoge la merma sin ningun cambio: ya filtra
--    por movement_type = 'damage'.
--
-- 2. document_counters: create-sale-return.usecase.ts numeraba con COUNT(*),
--    que con dos devoluciones concurrentes genera el mismo RET-00007 dos veces
--    y viola UNIQUE (org_id, return_number). Un contador con UPDATE ... RETURNING
--    serializa a los dos escritores sobre la misma fila.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Condicion de la linea devuelta
-- ---------------------------------------------------------------------------
ALTER TABLE sale_return_items
  ADD COLUMN IF NOT EXISTS condition text NOT NULL DEFAULT 'restock',
  ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE sale_return_items DROP CONSTRAINT IF EXISTS sale_return_items_condition_check;
ALTER TABLE sale_return_items ADD CONSTRAINT sale_return_items_condition_check
  CHECK (condition IN ('restock', 'damaged'));

-- Las devoluciones existentes repusieron stock: 'restock' describe lo que ya
-- paso, y el DEFAULT deja las filas antiguas correctas sin tocarlas.

-- ---------------------------------------------------------------------------
-- 2. Contadores de documento por organizacion
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_counters (
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  last_number bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, document_type)
);

ALTER TABLE document_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS document_counters_select ON document_counters;
CREATE POLICY document_counters_select ON document_counters
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS document_counters_insert ON document_counters;
CREATE POLICY document_counters_insert ON document_counters
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

DROP POLICY IF EXISTS document_counters_update ON document_counters;
CREATE POLICY document_counters_update ON document_counters
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_super_admin())
WITH CHECK (app.is_org_member(org_id) OR app.is_super_admin());

-- Arranque desde lo que ya existe, para no reemitir numeros ya usados.
INSERT INTO document_counters (org_id, document_type, last_number)
SELECT org_id, 'sale_return', COUNT(*)
FROM sale_returns
GROUP BY org_id
ON CONFLICT (org_id, document_type) DO NOTHING;

/**
 * Reserva el siguiente numero de forma atomica.
 *
 * El UPDATE toma un lock de fila: dos transacciones concurrentes se serializan
 * y cada una recibe un numero distinto. Con COUNT(*) ambas leian el mismo valor
 * y la segunda moria contra el indice unico.
 */
CREATE OR REPLACE FUNCTION app.next_document_number(p_org_id uuid, p_type text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_number bigint;
BEGIN
  INSERT INTO document_counters (org_id, document_type, last_number)
  VALUES (p_org_id, p_type, 0)
  ON CONFLICT (org_id, document_type) DO NOTHING;

  UPDATE document_counters
  SET last_number = last_number + 1,
      updated_at = now()
  WHERE org_id = p_org_id AND document_type = p_type
  RETURNING last_number INTO v_number;

  RETURN v_number;
END;
$$;

COMMIT;
