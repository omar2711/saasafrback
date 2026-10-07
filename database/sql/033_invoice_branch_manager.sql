-- =============================================================================
-- 033: Factura opcional en el punto de venta, encargado de sucursal y sucursal
--      principal.
--
-- 1. sales.document_type: marca si la venta se cobro con factura o con recibo.
--    No basta con mirar si existe fila en invoices: al anular una venta la
--    factura pasa a 'voided' y se perderia con que documento se vendio, que es
--    justo lo que hay que reimprimir y reportar. El NUMERO sigue viviendo solo
--    en invoices; document_type es la intencion, y es inmutable.
--
-- 2. trg_invoices_feature: el trigger exigia el feature 'module_invoicing', que
--    NINGUNA migracion inserta en plan_features (es su unica aparicion en todo
--    database/sql). app.plan_feature_enabled devuelve false cuando no encuentra
--    la fila, asi que HOY todo INSERT en invoices falla para cualquier
--    organizacion con "Feature module_invoicing not enabled". Como la factura
--    pasa a emitirse DENTRO de la transaccion de la venta, el gate tumbaria la
--    venta entera. Se retira: facturar es comportamiento base del punto de
--    venta, no un modulo de pago. Si algun dia se quiere volver a cobrar por
--    ello, se recrea el trigger con el feature ya sembrado en plan_features y
--    en plan_feature_limits de todos los planes.
--
-- 3. branches.manager_member_id: el encargado/dueno es un rol dentro de ESTA
--    organizacion, por eso apunta a org_members y no a users (con users nada
--    impediria asignar a alguien de otro tenant).
--
-- 4. branches.is_main: el badge "Principal" de la lista era posicional
--    (index === 0) sobre un ORDER BY created_at DESC, o sea que marcaba la
--    sucursal MAS NUEVA. Ahora es un dato.
--
-- Fuera de alcance a proposito: el calculo del impuesto (sigue siendo el 13%
-- que aplica el frontend) y las notas de credito. Una devolucion parcial NO
-- altera la factura; sigue emitiendo su propio documento RET-xxxxx.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tipo de documento de la venta
-- ---------------------------------------------------------------------------
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'receipt';

ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_document_type_check;
ALTER TABLE sales ADD CONSTRAINT sales_document_type_check
  CHECK (document_type IN ('receipt', 'invoice'));

-- Las ventas historicas se cobraron con recibo: el DEFAULT las deja correctas
-- sin tocarlas. Solo se corrigen las que ya tuvieran una factura emitida.
UPDATE sales s
SET document_type = 'invoice'
FROM invoices i
WHERE i.sale_id = s.id
  AND i.deleted_at IS NULL
  AND s.document_type <> 'invoice';

CREATE INDEX IF NOT EXISTS sales_org_document_type_idx
  ON sales (org_id, document_type, sold_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Desbloquear la emision de facturas
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_invoices_feature ON invoices;

-- Numeracion atomica reutilizando el contador de la 029 (app.next_document_number).
-- Arranque desde lo que ya existe, para no reemitir un numero ya usado.
INSERT INTO document_counters (org_id, document_type, last_number)
SELECT org_id, 'invoice', COUNT(*)
FROM invoices
WHERE deleted_at IS NULL
GROUP BY org_id
ON CONFLICT (org_id, document_type) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Encargado / dueno de la sucursal
-- ---------------------------------------------------------------------------
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS manager_member_id uuid;

-- ON DELETE SET NULL y no RESTRICT: dar de baja a una persona no debe bloquear
-- su baja ni dejar la sucursal apuntando a una membresia que ya no existe. La
-- sucursal sigue operando sin encargado. Que el miembro pertenezca a la misma
-- organizacion lo valida el usecase: una FK compuesta (org_id, member_id)
-- obligaria a anular tambien org_id, que es NOT NULL.
ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_manager_member_fk;
ALTER TABLE branches ADD CONSTRAINT branches_manager_member_fk
  FOREIGN KEY (manager_member_id) REFERENCES org_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS branches_manager_member_idx
  ON branches (manager_member_id)
  WHERE manager_member_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Sucursal principal
-- ---------------------------------------------------------------------------
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS is_main boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS branches_one_main_per_org
  ON branches (org_id)
  WHERE is_main AND deleted_at IS NULL;

-- La principal es la primera que se creo, que es lo que la interfaz venia
-- insinuando (mal) con el badge posicional.
WITH primera AS (
  SELECT DISTINCT ON (org_id) id
  FROM branches
  WHERE deleted_at IS NULL
  ORDER BY org_id, created_at ASC
)
UPDATE branches b
SET is_main = true
FROM primera p
WHERE b.id = p.id AND b.is_main = false;

COMMIT;
