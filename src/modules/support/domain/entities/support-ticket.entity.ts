export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting_customer',
  'resolved',
  'closed',
] as const;

export const TICKET_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

/**
 * 'customer' o 'agent' se congela al escribir el mensaje. Si el autor deja de
 * ser agente manana, el historico debe seguir leyendose igual.
 */
export type TicketAuthorRole = 'customer' | 'agent';

export interface SupportTicketMessageEntity {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string | null;
  authorRole: TicketAuthorRole;
  body: string;
  createdAt: string;
}

export interface SupportTicketEntity {
  id: string;
  orgId: string;
  orgName: string | null;
  createdBy: string;
  createdByName: string | null;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo: string | null;
  assignedToName: string | null;
  messageCount: number;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  /** Solo en el detalle; el listado lo deja vacio. */
  messages: SupportTicketMessageEntity[];
}
