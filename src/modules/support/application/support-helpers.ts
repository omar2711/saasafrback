import { DbClient, RlsContext } from '../../../database/db.service';
import {
  SupportTicketEntity,
  SupportTicketMessageEntity,
} from '../domain/entities/support-ticket.entity';

export interface TicketRow {
  id: string;
  org_id: string;
  org_name: string | null;
  created_by: string;
  created_by_name: string | null;
  subject: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  message_count: string;
  last_message_at: Date;
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
}

export interface MessageRow {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name: string | null;
  author_role: string;
  body: string;
  created_at: Date;
}

export const TICKET_SELECT = `
  SELECT t.id, t.org_id, o.name AS org_name,
         t.created_by, cu.full_name AS created_by_name,
         t.subject, t.status, t.priority,
         t.assigned_to, au.full_name AS assigned_to_name,
         (SELECT COUNT(*) FROM support_ticket_messages m WHERE m.ticket_id = t.id) AS message_count,
         t.last_message_at, t.created_at, t.updated_at, t.closed_at
  FROM support_tickets t
  LEFT JOIN orgs o ON o.id = t.org_id
  LEFT JOIN users cu ON cu.id = t.created_by
  LEFT JOIN users au ON au.id = t.assigned_to
`;

export function mapMessage(row: MessageRow): SupportTicketMessageEntity {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorId: row.author_id,
    authorName: row.author_name ?? null,
    authorRole: row.author_role as SupportTicketMessageEntity['authorRole'],
    body: row.body,
    createdAt: row.created_at.toISOString(),
  };
}

export function mapTicket(row: TicketRow, messages: MessageRow[] = []): SupportTicketEntity {
  return {
    id: row.id,
    orgId: row.org_id,
    orgName: row.org_name ?? null,
    createdBy: row.created_by,
    createdByName: row.created_by_name ?? null,
    subject: row.subject,
    status: row.status as SupportTicketEntity['status'],
    priority: row.priority as SupportTicketEntity['priority'],
    assignedTo: row.assigned_to ?? null,
    assignedToName: row.assigned_to_name ?? null,
    messageCount: Number(row.message_count),
    lastMessageAt: row.last_message_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    closedAt: row.closed_at ? row.closed_at.toISOString() : null,
    messages: messages.map(mapMessage),
  };
}

export async function loadTicket(
  client: DbClient,
  ticketId: string,
): Promise<SupportTicketEntity | null> {
  const [row] = await client.query<TicketRow>(`${TICKET_SELECT} WHERE t.id = $1`, [ticketId]);
  if (!row) return null;

  const messages = await client.query<MessageRow>(
    `SELECT m.id, m.ticket_id, m.author_id, u.full_name AS author_name,
            m.author_role, m.body, m.created_at
     FROM support_ticket_messages m
     LEFT JOIN users u ON u.id = m.author_id
     WHERE m.ticket_id = $1
     ORDER BY m.created_at ASC`,
    [ticketId],
  );

  return mapTicket(row, messages);
}

/**
 * Un agente escribe como 'agent' y cualquier otro como 'customer'. Se resuelve
 * en SQL con app.is_support_agent() y no en Node porque la lista de agentes
 * puede cambiar y la BD es la unica fuente de verdad; ademas es la misma
 * funcion que usan las politicas de RLS.
 */
export async function isSupportAgent(client: DbClient, context: RlsContext): Promise<boolean> {
  if (context.isSuperAdmin) return true;
  const [row] = await client.query<{ is_agent: boolean }>(
    'SELECT app.is_support_agent() AS is_agent',
  );
  return row?.is_agent ?? false;
}
