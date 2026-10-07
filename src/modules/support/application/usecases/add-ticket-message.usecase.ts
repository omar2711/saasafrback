import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import {
  SupportTicketEntity,
  SupportTicketMessageEntity,
} from '../../domain/entities/support-ticket.entity';
import { CreateTicketMessageDto } from '../../presentation/dto/support.dto';
import { isSupportAgent, loadTicket, mapMessage, MessageRow } from '../support-helpers';

export interface AddTicketMessageResult {
  message: SupportTicketMessageEntity;
  /** Necesario para saber a que sala del socket retransmitir. */
  orgId: string;
  ticketStatus: string;
  /**
   * El ticket ya actualizado, SIN el hilo: responder le cambia el estado y hay
   * que retransmitirlo o el badge de la lista se queda obsoleto. Se manda vacio
   * de mensajes a proposito: el cliente conserva los suyos y no tiene sentido
   * reenviar la conversacion entera en cada respuesta.
   */
  ticket: SupportTicketEntity | null;
}

@Injectable()
export class AddTicketMessageUseCase {
  constructor(private readonly db: DbService) {}

  async execute(
    context: RlsContext,
    ticketId: string,
    dto: CreateTicketMessageDto,
  ): Promise<AddTicketMessageResult> {
    if (!context.userId) {
      throw new ForbiddenException('User context missing');
    }

    return this.db.withRls(context, async (client) => {
      // FOR UPDATE: last_message_at y el cambio de estado se escriben junto al
      // mensaje, y dos respuestas simultaneas no deben pisarse.
      const [ticket] = await client.query<{ id: string; org_id: string; status: string }>(
        `SELECT id, org_id, status FROM support_tickets WHERE id = $1 FOR UPDATE`,
        [ticketId],
      );
      if (!ticket) {
        throw new NotFoundException('Ticket no encontrado');
      }
      if (ticket.status === 'closed') {
        throw new BadRequestException('El ticket esta cerrado. Abre uno nuevo para continuar.');
      }

      const agent = await isSupportAgent(client, context);

      const [row] = await client.query<MessageRow>(
        `INSERT INTO support_ticket_messages (ticket_id, author_id, author_role, body)
         VALUES ($1, $2, $3, $4)
         RETURNING id, ticket_id, author_id, author_role, body, created_at`,
        [ticketId, context.userId, agent ? 'agent' : 'customer', dto.body.trim()],
      );

      const [author] = await client.query<{ full_name: string | null }>(
        'SELECT full_name FROM users WHERE id = $1',
        [context.userId],
      );

      // Quien responde mueve el estado al lado contrario: si contesta el agente,
      // la pelota queda en el cliente, y viceversa. Un ticket 'resolved' que
      // recibe respuesta vuelve a abrirse.
      const nextStatus = agent
        ? 'waiting_customer'
        : ticket.status === 'open'
          ? 'open'
          : 'in_progress';

      await client.execute(
        `UPDATE support_tickets
         SET status = $2, last_message_at = now(), updated_at = now()
         WHERE id = $1`,
        [ticketId, nextStatus],
      );

      const updated = await loadTicket(client, ticketId);

      return {
        message: mapMessage({ ...row, author_name: author?.full_name ?? null }),
        orgId: ticket.org_id,
        ticketStatus: nextStatus,
        ticket: updated ? { ...updated, messages: [] } : null,
      };
    });
  }
}
