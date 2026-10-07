import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import { buildPaginationClause } from '../../../../common/utils/pagination';
import { AuditLogEntity } from '../../domain/entities/audit-log.entity';
import { ListAuditLogsDto } from '../../presentation/dto/list-audit-logs.dto';

interface AuditLogRow {
  id: string;
  org_id: string | null;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: Date;
}

@Injectable()
export class ListAuditLogsUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, filter: ListAuditLogsDto = {}): Promise<AuditLogEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const conditions: string[] = ['a.org_id = $1'];
    const params: unknown[] = [orgId];

    if (filter.action) {
      params.push(filter.action);
      conditions.push(`a.action = $${params.length}`);
    }
    if (filter.entityType) {
      params.push(filter.entityType);
      conditions.push(`a.entity_type = $${params.length}`);
    }
    if (filter.userId) {
      params.push(filter.userId);
      conditions.push(`a.user_id = $${params.length}`);
    }
    if (filter.dateFrom) {
      params.push(filter.dateFrom);
      conditions.push(`a.created_at >= $${params.length}`);
    }
    if (filter.dateTo) {
      params.push(filter.dateTo);
      conditions.push(`a.created_at <= $${params.length}`);
    }

    const pagination = buildPaginationClause(filter, params);

    const rows = await this.db.withRls(context, (client) =>
      client.query<AuditLogRow>(
        `SELECT a.id, a.org_id, a.user_id, u.full_name AS user_name, u.email AS user_email,
                a.action, a.entity_type, a.entity_id, a.metadata, a.ip, a.user_agent, a.created_at
         FROM audit_logs a
         LEFT JOIN users u ON u.id = a.user_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY a.created_at DESC
         ${pagination}`,
        params,
      ),
    );

    return rows.map((row) => ({
      id: row.id,
      orgId: row.org_id,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: row.metadata,
      ip: row.ip,
      userAgent: row.user_agent,
      createdAt: row.created_at.toISOString(),
    }));
  }
}
