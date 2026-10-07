import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import { SupportTicketEntity } from '../../domain/entities/support-ticket.entity';
import { UpdateTicketDto } from '../../presentation/dto/support.dto';
import { isSupportAgent, loadTicket } from '../support-helpers';

@Injectable()
export class UpdateTicketUseCase {
  constructor(private readonly db: DbService) {}

  async execute(
    context: RlsContext,
    ticketId: string,
    dto: UpdateTicketDto,
  ): Promise<SupportTicketEntity> {
    const ticket = await this.db.withRls(context, async (client) => {
      const [existing] = await client.query<{ id: string; status: string }>(
        'SELECT id, status FROM support_tickets WHERE id = $1 FOR UPDATE',
        [ticketId],
      );
      if (!existing) {
        throw new NotFoundException('Ticket no encontrado');
      }

      const agent = await isSupportAgent(client, context);

      // Asignar y priorizar son decisiones de soporte. El cliente solo puede
      // cerrar o reabrir su propio ticket.
      if (!agent) {
        if (dto.assignedTo !== undefined || dto.priority !== undefined) {
          throw new ForbiddenException('Solo el equipo de soporte puede asignar o priorizar');
        }
        if (dto.status !== undefined && !['closed', 'open'].includes(dto.status)) {
          throw new ForbiddenException('Solo puedes cerrar o reabrir tu ticket');
        }
      }

      await client.execute(
        `UPDATE support_tickets
         SET status = COALESCE($2::text, status),
             priority = COALESCE($3::text, priority),
             assigned_to = CASE WHEN $4::boolean THEN $5::uuid ELSE assigned_to END,
             closed_at = CASE
               WHEN $2::text = 'closed' THEN now()
               WHEN $2::text IS NOT NULL THEN NULL
               ELSE closed_at
             END,
             updated_at = now()
         WHERE id = $1`,
        [
          ticketId,
          dto.status ?? null,
          dto.priority ?? null,
          dto.assignedTo !== undefined,
          dto.assignedTo ?? null,
        ],
      );

      return loadTicket(client, ticketId);
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
    return ticket;
  }
}
