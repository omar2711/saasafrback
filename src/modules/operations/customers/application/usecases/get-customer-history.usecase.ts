import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';

export interface CustomerHistorySale {
  id: string;
  saleNumber: string;
  status: string;
  soldAt: string;
  total: number;
  paymentMethod: string | null;
  branchName: string | null;
  itemCount: number;
}

export interface CustomerHistoryQuote {
  id: string;
  quoteNumber: string;
  status: string;
  validUntil: string | null;
  total: number;
  branchName: string | null;
  itemCount: number;
  createdAt: string;
}

export interface CustomerHistoryResult {
  summary: {
    salesCount: number;
    salesTotal: number;
    quotesCount: number;
    lastPurchaseAt: string | null;
  };
  sales: CustomerHistorySale[];
  quotes: CustomerHistoryQuote[];
}

interface SaleRow {
  id: string;
  sale_number: string;
  status: string;
  sold_at: Date;
  total: string;
  payment_method: string | null;
  branch_name: string | null;
  item_count: string;
}

interface QuoteRow {
  id: string;
  quote_number: string;
  status: string;
  valid_until: Date | null;
  total: string;
  branch_name: string | null;
  item_count: string;
  created_at: Date;
}

@Injectable()
export class GetCustomerHistoryUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, customerId: string): Promise<CustomerHistoryResult> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const { saleRows, quoteRows } = await this.db.withRls(context, async (client) => {
      const saleRows = await client.query<SaleRow>(
        `SELECT s.id, s.sale_number, s.status, s.sold_at, s.total, s.payment_method,
                b.name AS branch_name,
                (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS item_count
         FROM sales s
         LEFT JOIN branches b ON b.id = s.branch_id
         WHERE s.org_id = $1 AND s.customer_id = $2 AND s.deleted_at IS NULL
         ORDER BY s.sold_at DESC`,
        [orgId, customerId],
      );

      const quoteRows = await client.query<QuoteRow>(
        `SELECT q.id, q.quote_number, q.status, q.valid_until, q.total, q.created_at,
                b.name AS branch_name,
                (SELECT COUNT(*) FROM quote_items qi WHERE qi.quote_id = q.id) AS item_count
         FROM quotes q
         LEFT JOIN branches b ON b.id = q.branch_id
         WHERE q.org_id = $1 AND q.customer_id = $2 AND q.deleted_at IS NULL
         ORDER BY q.created_at DESC`,
        [orgId, customerId],
      );

      return { saleRows, quoteRows };
    });

    const sales: CustomerHistorySale[] = saleRows.map((row) => ({
      id: row.id,
      saleNumber: row.sale_number,
      status: row.status,
      soldAt: row.sold_at.toISOString(),
      total: toNumber(row.total),
      paymentMethod: row.payment_method ?? null,
      branchName: row.branch_name ?? null,
      itemCount: Number(row.item_count),
    }));

    const quotes: CustomerHistoryQuote[] = quoteRows.map((row) => ({
      id: row.id,
      quoteNumber: row.quote_number,
      status: row.status,
      validUntil: row.valid_until ? row.valid_until.toISOString() : null,
      total: toNumber(row.total),
      branchName: row.branch_name ?? null,
      itemCount: Number(row.item_count),
      createdAt: row.created_at.toISOString(),
    }));

    // Las ventas anuladas se listan pero no cuentan para lo facturado al cliente.
    const billedSales = sales.filter((sale) => sale.status !== 'voided');

    return {
      summary: {
        salesCount: billedSales.length,
        salesTotal: billedSales.reduce((sum, sale) => sum + sale.total, 0),
        quotesCount: quotes.length,
        lastPurchaseAt: billedSales[0]?.soldAt ?? null,
      },
      sales,
      quotes,
    };
  }
}
