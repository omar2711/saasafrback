import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import { buildPaginationClause } from '../../../../common/utils/pagination';
import { SupportTicketEntity } from '../../domain/entities/support-ticket.entity';
import { ListTicketsDto } from '../../presentation/dto/support.dto';
import { isSupportAgent, mapTicket, TICKET_SELECT, TicketRow } from '../support-helpers';

@Injectable()
export class ListTicketsUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, filter: ListTicketsDto = {}): Promise<SupportTicketEntity[]> {
    if (!context.userId) {
      throw new ForbiddenException('User context missing');
    }

    return this.db.withRls(context, async (client) => {
      const agent = await isSupportAgent(client, context);

      const conditions: string[] = [];
      const params: unknown[] = [];

      // Un cliente ve solo su organizacion, aunque mande otro orgId en la query.
      // RLS ya lo impediria, pero fallar en silencio con una lista vacia seria
      // confuso: mejor ignorar el filtro que no le corresponde.
      if (agent) {
        if (filter.orgId) {
          params.push(filter.orgId);
          conditions.push(`t.org_id = $${params.length}`);
        }
      } else {
        if (!context.orgId) {
          throw new ForbiddenException('Tenant context missing');
        }
        params.push(context.orgId);
        conditions.push(`t.org_id = $${params.length}`);
      }

      if (filter.status) {
        params.push(filter.status);
        conditions.push(`t.status = $${params.length}`);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const pagination = buildPaginationClause(filter, params);

      const rows = await client.query<TicketRow>(
        `${TICKET_SELECT} ${where} ORDER BY t.last_message_at DESC ${pagination}`,
        params,
      );

      // El listado no trae los mensajes: en un ticket largo serian cientos de
      // filas por cada fila de la tabla.
      return rows.map((row) => mapTicket(row));
    });
  }
}
