import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import { SupportTicketEntity } from '../../domain/entities/support-ticket.entity';
import { loadTicket } from '../support-helpers';

@Injectable()
export class GetTicketUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, ticketId: string): Promise<SupportTicketEntity> {
    const ticket = await this.db.withRls(context, (client) => loadTicket(client, ticketId));
    // RLS ya filtra por organizacion o agente: si no hay fila, o no existe o no
    // es visible, y en ambos casos la respuesta correcta es 404.
    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    return ticket;
  }
}
