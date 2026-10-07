import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import { INVOICE_COLUMNS, InvoiceRow, mapInvoice } from '../invoice-helpers';
import { PaymentEntity } from '../../domain/entities/payment.entity';
import { SaleEntity } from '../../domain/entities/sale.entity';
import { SaleItemEntity } from '../../domain/entities/sale-item.entity';

interface SaleRow {
  id: string;
  org_id: string;
  branch_id: string;
  branch_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_tax_id: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
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
  client_email: string | null;
  client_address: string | null;
  payment_method: string | null;
  sold_by: string | null;
  sold_by_name: string | null;
  voided_at: Date | null;
  delivered_at: Date | null;
  document_type: string;
  created_at: Date;
  updated_at: Date;
}

interface SaleItemRow {
  id: string;
  org_id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string | null;
  product_sku: string | null;
  kit_id: string | null;
  kit_name: string | null;
  quantity: string;
  unit_price: string;
  unit_cost: string;
  discount: string;
  total: string;
  total_cost: string;
  created_at: Date;
}

interface PaymentRow {
  id: string;
  org_id: string;
  sale_id: string;
  amount: string;
  method: string;
  status: string;
  paid_at: Date;
  created_at: Date;
}

@Injectable()
export class GetSaleUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, saleId: string): Promise<SaleEntity> {
    const result = await this.db.withRls(context, async (client) => {
      const [sale] = await client.query<SaleRow>(
        `SELECT s.id, s.org_id, s.branch_id, b.name AS branch_name,
                s.customer_id, c.name AS customer_name, c.tax_id AS customer_tax_id,
                c.phone AS customer_phone, c.email AS customer_email, c.address AS customer_address,
                s.quote_id, s.sale_number, s.status, s.sold_at,
                s.subtotal, s.discount_total, s.tax_total, s.total, s.cost_total,
                s.client_name, s.client_nit, s.client_phone, s.client_email, s.client_address,
                s.payment_method, s.sold_by, u.full_name AS sold_by_name,
                s.voided_at, s.delivered_at, s.document_type, s.created_at, s.updated_at
         FROM sales s
         LEFT JOIN branches b ON b.id = s.branch_id
         LEFT JOIN customers c ON c.id = s.customer_id
         LEFT JOIN users u ON u.id = s.sold_by
         WHERE s.id = $1 AND s.deleted_at IS NULL`,
        [saleId],
      );

      if (!sale) {
        return null;
      }

      const items = await client.query<SaleItemRow>(
        `SELECT si.id, si.org_id, si.sale_id,
                si.product_id, p.name AS product_name, p.sku AS product_sku,
                si.kit_id, k.name AS kit_name,
                si.quantity, si.unit_price, si.unit_cost, si.discount, si.total, si.total_cost, si.created_at
         FROM sale_items si
         LEFT JOIN kits k ON k.id = si.kit_id
         LEFT JOIN products p ON p.id = si.product_id
         WHERE si.sale_id = $1
         ORDER BY si.created_at ASC`,
        [saleId],
      );

      const payments = await client.query<PaymentRow>(
        `SELECT id, org_id, sale_id, amount, method, status, paid_at, created_at
         FROM payments
         WHERE sale_id = $1
         ORDER BY created_at ASC`,
        [saleId],
      );

      const [invoice] = await client.query<InvoiceRow>(
        `SELECT ${INVOICE_COLUMNS} FROM invoices WHERE sale_id = $1 AND deleted_at IS NULL`,
        [saleId],
      );

      return { sale, items, payments, invoice };
    });

    if (!result) {
      throw new NotFoundException('Venta no encontrada');
    }

    const items: SaleItemEntity[] = result.items.map((item) => ({
      id: item.id,
      orgId: item.org_id,
      saleId: item.sale_id,
      productId: item.product_id,
      productName: item.product_name,
      productSku: item.product_sku,
      kitId: item.kit_id,
      kitName: item.kit_name,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unit_price),
      unitCost: toNumber(item.unit_cost),
      discount: toNumber(item.discount),
      total: toNumber(item.total),
      totalCost: toNumber(item.total_cost),
      createdAt: item.created_at.toISOString(),
    }));

    const payments: PaymentEntity[] = result.payments.map((payment) => ({
      id: payment.id,
      orgId: payment.org_id,
      saleId: payment.sale_id,
      amount: toNumber(payment.amount),
      method: payment.method as PaymentEntity['method'],
      status: payment.status as PaymentEntity['status'],
      paidAt: payment.paid_at.toISOString(),
      createdAt: payment.created_at.toISOString(),
    }));

    const invoice: InvoiceEntity | null = result.invoice ? mapInvoice(result.invoice) : null;

    const sale = result.sale;
    return {
      id: sale.id,
      orgId: sale.org_id,
      branchId: sale.branch_id,
      branchName: sale.branch_name ?? null,
      customerId: sale.customer_id ?? null,
      customerName: sale.customer_name ?? null,
      customerTaxId: sale.customer_tax_id ?? null,
      customerPhone: sale.customer_phone ?? null,
      customerEmail: sale.customer_email ?? null,
      customerAddress: sale.customer_address ?? null,
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
      clientEmail: sale.client_email ?? null,
      clientAddress: sale.client_address ?? null,
      paymentMethod: (sale.payment_method as SaleEntity['paymentMethod']) ?? null,
      soldBy: sale.sold_by ?? null,
      soldByName: sale.sold_by_name ?? null,
      voidedAt: sale.voided_at ? sale.voided_at.toISOString() : null,
      deliveredAt: sale.delivered_at ? sale.delivered_at.toISOString() : null,
      documentType: sale.document_type as SaleEntity['documentType'],
      invoiceNumber: invoice?.invoiceNumber ?? null,
      invoiceStatus: invoice?.status ?? null,
      itemCount: items.length,
      depositTotal: payments
        .filter((payment) => payment.status !== 'voided')
        .reduce((sum, payment) => sum + payment.amount, 0),
      createdAt: sale.created_at.toISOString(),
      updatedAt: sale.updated_at.toISOString(),
      items,
      payments,
      invoice,
    };
  }
}
