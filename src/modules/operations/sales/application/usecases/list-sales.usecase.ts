import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { buildPaginationClause, type PaginationFilter } from '../../../../../common/utils/pagination';
import { toNumber } from '../../../../../common/utils/numbers';
import { SaleEntity } from '../../domain/entities/sale.entity';

interface SaleRow {
  id: string;
  org_id: string;
  branch_id: string;
  branch_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_tax_id: string | null;
  customer_phone: string | null;
  quote_id: string | null;
  sale_number: string;
  status: string;
  sold_at: Date;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
  cost_total: string;
  client_name: string | null;
  client_nit: string | null;
  client_phone: string | null;
  payment_method: string | null;
  sold_by: string | null;
  sold_by_name: string | null;
  voided_at: Date | null;
  delivered_at: Date | null;
  document_type: string;
  invoice_number: string | null;
  invoice_status: string | null;
  created_at: Date;
  updated_at: Date;
  item_count: string;
  deposit_total: string;
}

export interface ListSalesFilter extends PaginationFilter {
  branchId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class ListSalesUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, filter: ListSalesFilter = {}): Promise<SaleEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const conditions: string[] = ['s.org_id = $1', 's.deleted_at IS NULL'];
    const params: unknown[] = [orgId];

    if (filter.branchId) {
      params.push(filter.branchId);
      conditions.push(`s.branch_id = $${params.length}`);
    }
    if (filter.status) {
      params.push(filter.status);
      conditions.push(`s.status = $${params.length}`);
    }
    if (filter.dateFrom) {
      params.push(filter.dateFrom);
      conditions.push(`s.sold_at >= $${params.length}`);
    }
    if (filter.dateTo) {
      params.push(filter.dateTo);
      conditions.push(`s.sold_at <= $${params.length}`);
    }

    const pagination = buildPaginationClause(filter, params);

    const sales = await this.db.withRls(context, (client) =>
      client.query<SaleRow>(
        `SELECT s.id, s.org_id, s.branch_id, b.name AS branch_name,
                s.customer_id, c.name AS customer_name, c.tax_id AS customer_tax_id, c.phone AS customer_phone,
                s.quote_id, s.sale_number, s.status, s.sold_at,
                s.subtotal, s.discount_total, s.tax_total, s.total, s.cost_total,
                s.client_name, s.client_nit, s.client_phone,
                s.payment_method, s.sold_by, u.full_name AS sold_by_name,
                s.voided_at, s.delivered_at, s.document_type, s.created_at, s.updated_at,
                inv.invoice_number, inv.status AS invoice_status,
                (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS item_count,
                COALESCE(pay.paid_total, 0) AS deposit_total
         FROM sales s
         LEFT JOIN LATERAL (
           SELECT SUM(p.amount) AS paid_total
           FROM payments p
           WHERE p.sale_id = s.id AND p.status <> 'voided'
         ) pay ON true
         LEFT JOIN LATERAL (
           SELECT i.invoice_number, i.status
           FROM invoices i
           WHERE i.sale_id = s.id AND i.deleted_at IS NULL
           LIMIT 1
         ) inv ON true
         LEFT JOIN branches b ON b.id = s.branch_id
         LEFT JOIN customers c ON c.id = s.customer_id
         LEFT JOIN users u ON u.id = s.sold_by
         WHERE ${conditions.join(' AND ')}
         ORDER BY s.created_at DESC
         ${pagination}`,
        params,
      ),
    );

    return sales.map((sale) => ({
      id: sale.id,
      orgId: sale.org_id,
      branchId: sale.branch_id,
      branchName: sale.branch_name ?? null,
      customerId: sale.customer_id ?? null,
      customerName: sale.customer_name ?? null,
      customerTaxId: sale.customer_tax_id ?? null,
      customerPhone: sale.customer_phone ?? null,
      quoteId: sale.quote_id ?? null,
      saleNumber: sale.sale_number,
      status: sale.status as SaleEntity['status'],
      soldAt: sale.sold_at.toISOString(),
      subtotal: toNumber(sale.subtotal),
      discountTotal: toNumber(sale.discount_total),
      taxTotal: toNumber(sale.tax_total),
      total: toNumber(sale.total),
      costTotal: toNumber(sale.cost_total),
      clientName: sale.client_name ?? null,
      clientNit: sale.client_nit ?? null,
      clientPhone: sale.client_phone ?? null,
      paymentMethod: (sale.payment_method as SaleEntity['paymentMethod']) ?? null,
      soldBy: sale.sold_by ?? null,
      soldByName: sale.sold_by_name ?? null,
      voidedAt: sale.voided_at ? sale.voided_at.toISOString() : null,
      deliveredAt: sale.delivered_at ? sale.delivered_at.toISOString() : null,
      documentType: sale.document_type as SaleEntity['documentType'],
      invoiceNumber: sale.invoice_number ?? null,
      invoiceStatus: (sale.invoice_status as SaleEntity['invoiceStatus']) ?? null,
      itemCount: toNumber(sale.item_count),
      depositTotal: toNumber(sale.deposit_total),
      createdAt: sale.created_at.toISOString(),
      updatedAt: sale.updated_at.toISOString(),
    }));
  }
}
