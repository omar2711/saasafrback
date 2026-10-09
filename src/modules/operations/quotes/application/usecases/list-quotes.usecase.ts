import { ForbiddenException, Injectable } from '@nestjs/common';
import { buildPaginationClause, type PaginationFilter } from '../../../../../common/utils/pagination';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { QuoteEntity } from '../../domain/entities/quote.entity';

interface QuoteRow {
  id: string;
  org_id: string;
  branch_id: string;
  branch_name: string | null;
  customer_id: string | null;
  quote_number: string;
  status: string;
  valid_until: Date | null;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
  notes: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  created_at: Date;
  updated_at: Date;
  item_count: string;
}

export interface ListQuotesFilter extends PaginationFilter {
  branchId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class ListQuotesUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, filter: ListQuotesFilter = {}): Promise<QuoteEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const conditions: string[] = ['q.org_id = $1', 'q.deleted_at IS NULL'];
    const params: unknown[] = [orgId];

    if (filter.branchId) {
      params.push(filter.branchId);
      conditions.push(`q.branch_id = $${params.length}`);
    }
    if (filter.status) {
      params.push(filter.status);
      conditions.push(`q.status = $${params.length}`);
    }
    if (filter.dateFrom) {
      params.push(filter.dateFrom);
      conditions.push(`q.created_at >= $${params.length}`);
    }
    if (filter.dateTo) {
      params.push(filter.dateTo);
      conditions.push(`q.created_at <= $${params.length}`);
    }

    const pagination = buildPaginationClause(filter, params);

    const quotes = await this.db.withRls(context, (client) =>
      client.query<QuoteRow>(
        `SELECT q.id, q.org_id, q.branch_id, b.name AS branch_name, q.customer_id, q.quote_number, q.status,
                q.valid_until, q.subtotal, q.discount_total, q.tax_total, q.total, q.notes,
                q.client_name, q.client_phone, q.client_email, q.created_at, q.updated_at,
                (SELECT COUNT(*) FROM quote_items qi WHERE qi.quote_id = q.id) AS item_count
         FROM quotes q
         LEFT JOIN branches b ON b.id = q.branch_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY q.created_at DESC, q.id DESC
         ${pagination}`,
        params,
      ),
    );

    return quotes.map((quote) => ({
      id: quote.id,
      orgId: quote.org_id,
      branchId: quote.branch_id,
      branchName: quote.branch_name ?? null,
      customerId: quote.customer_id ?? null,
      quoteNumber: quote.quote_number,
      status: quote.status as QuoteEntity['status'],
      validUntil: quote.valid_until ? quote.valid_until.toISOString() : null,
      subtotal: toNumber(quote.subtotal),
      discountTotal: toNumber(quote.discount_total),
      taxTotal: toNumber(quote.tax_total),
      total: toNumber(quote.total),
      notes: quote.notes ?? null,
      clientName: quote.client_name ?? null,
      clientPhone: quote.client_phone ?? null,
      clientEmail: quote.client_email ?? null,
      itemCount: toNumber(quote.item_count),
      createdAt: quote.created_at.toISOString(),
      updatedAt: quote.updated_at.toISOString(),
    }));
  }
}
