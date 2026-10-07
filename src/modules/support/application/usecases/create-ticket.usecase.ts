import { ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import { SupportTicketEntity } from '../../domain/entities/support-ticket.entity';
import { CreateTicketDto } from '../../presentation/dto/support.dto';
import { isSupportAgent, loadTicket } from '../support-helpers';

@Injectable()
export class CreateTicketUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, dto: CreateTicketDto): Promise<SupportTicketEntity> {
    const orgId = context.orgId;
    if (!orgId || !context.userId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const ticketId = await this.db.withRls(context, async (client) => {
      const agent = await isSupportAgent(client, context);

      const [ticket] = await client.query<{ id: string }>(
        `INSERT INTO support_tickets (org_id, created_by, subject, priority)
         VALUES ($1, $2, $3, COALESCE($4, 'normal'))
         RETURNING id`,
        [orgId, context.userId, dto.subject.trim(), dto.priority ?? null],
      );

      // El primer mensaje es el cuerpo del ticket: asi el hilo se lee completo
      // desde el principio y no hay dos formatos distintos de "descripcion".
      await client.execute(
        `INSERT INTO support_ticket_messages (ticket_id, author_id, author_role, body)
         VALUES ($1, $2, $3, $4)`,
        [ticket.id, context.userId, agent ? 'agent' : 'customer', dto.body.trim()],
      );

      return ticket.id;
    });

    const result = await this.db.withRls(context, (client) => loadTicket(client, ticketId));
    if (!result) {
      throw new InternalServerErrorException('No se pudo leer el ticket recien creado');
    }
    return result;
  }
}
