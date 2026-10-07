-- =============================================================================
-- 032: Soporte tecnico con tickets
--
-- Atendido por el super admin de momento. `support_agents` y el permiso
-- `support.manage` son la costura para delegarlo despues a un rol de Soporte
-- SIN migraciones nuevas: basta con insertar filas en support_agents o conceder
-- el permiso a un rol.
--
-- El socket NUNCA escribe: todas las mutaciones van por REST y el gateway solo
-- retransmite lo que el usecase ya persistio. Asi hay un unico camino de
-- autorizacion (los mismos guards de siempre) y si el socket cae, la pantalla
-- degrada a polling sin perder nada.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Agentes de soporte
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_agents (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_agents ENABLE ROW LEVEL SECURITY;

-- Solo el super admin gestiona la lista; cualquiera puede consultarla para
-- saber si el mismo es agente.
DROP POLICY IF EXISTS support_agents_select ON support_agents;
CREATE POLICY support_agents_select ON support_agents
FOR SELECT
USING (true);

DROP POLICY IF EXISTS support_agents_write ON support_agents;
CREATE POLICY support_agents_write ON support_agents
FOR ALL
USING (app.is_super_admin())
WITH CHECK (app.is_super_admin());

/**
 * Un agente de soporte ve los tickets de TODAS las organizaciones. Es lo que
 * distingue este modulo del resto: aqui el aislamiento por tenant se rompe a
 * proposito, y por eso la comprobacion vive en una funcion unica y auditable en
 * vez de repetirse en cada politica.
 */
CREATE OR REPLACE FUNCTION app.is_support_agent() RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT app.is_super_admin() OR EXISTS (
    SELECT 1 FROM support_agents sa WHERE sa.user_id = app.user_id()
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Tickets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  -- Para el badge de "sin leer" sin tener que contar mensajes cada vez.
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);

CREATE INDEX IF NOT EXISTS support_tickets_org_status_idx
  ON support_tickets (org_id, status, last_message_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_status_idx
  ON support_tickets (status, last_message_at DESC);

CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  -- Se guarda al escribir y no se deriva al leer: si manana el autor deja de
  -- ser agente, el mensaje historico seguiria mostrandose como del cliente.
  author_role text NOT NULL CHECK (author_role IN ('customer', 'agent')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_idx
  ON support_ticket_messages (ticket_id, created_at);

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_select ON support_tickets;
CREATE POLICY support_tickets_select ON support_tickets
FOR SELECT
USING (app.is_org_member(org_id) OR app.is_support_agent());

DROP POLICY IF EXISTS support_tickets_insert ON support_tickets;
CREATE POLICY support_tickets_insert ON support_tickets
FOR INSERT
WITH CHECK (app.is_org_member(org_id) OR app.is_support_agent());

DROP POLICY IF EXISTS support_tickets_update ON support_tickets;
CREATE POLICY support_tickets_update ON support_tickets
FOR UPDATE
USING (app.is_org_member(org_id) OR app.is_support_agent())
WITH CHECK (app.is_org_member(org_id) OR app.is_support_agent());

DROP POLICY IF EXISTS support_ticket_messages_select ON support_ticket_messages;
CREATE POLICY support_ticket_messages_select ON support_ticket_messages
FOR SELECT
USING (
  app.is_support_agent()
  OR EXISTS (
    SELECT 1 FROM support_tickets t
    WHERE t.id = ticket_id AND app.is_org_member(t.org_id)
  )
);

DROP POLICY IF EXISTS support_ticket_messages_insert ON support_ticket_messages;
CREATE POLICY support_ticket_messages_insert ON support_ticket_messages
FOR INSERT
WITH CHECK (
  app.is_support_agent()
  OR EXISTS (
    SELECT 1 FROM support_tickets t
    WHERE t.id = ticket_id AND app.is_org_member(t.org_id)
  )
);

-- ---------------------------------------------------------------------------
-- 4. Permisos
-- ---------------------------------------------------------------------------
INSERT INTO permissions (code, description) VALUES
  ('support.read',   'Ver los tickets de soporte de la organizacion'),
  ('support.write',  'Abrir tickets de soporte y responder'),
  ('support.manage', 'Atender tickets de soporte de cualquier organizacion')
ON CONFLICT (code) DO NOTHING;

-- Abrir un ticket no deberia requerir ser Gerente: cualquier rol de sistema
-- puede pedir ayuda y leer sus propios tickets.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.is_system = true
  AND r.name IN ('Gerente', 'Administrador', 'Vendedor', 'Almacenero')
  AND p.code IN ('support.read', 'support.write')
ON CONFLICT DO NOTHING;

COMMIT;
