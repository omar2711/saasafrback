import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { QuoteEntity } from '../../domain/entities/quote.entity';
import { QuoteItemEntity } from '../../domain/entities/quote-item.entity';

interface QuoteRow {
  id: string;
  org_id: string;
  branch_id: string;
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
  client_company: string | null;
  client_nit: string | null;
  client_address: string | null;
  created_at: Date;
  updated_at: Date;
}

interface QuoteItemRow {
  id: string;
  org_id: string;
  quote_id: string;
  product_id: string | null;
  kit_id: string | null;
  kit_name: string | null;
  product_name: string | null;
  product_sku: string | null;
  product_unit: string | null;
  quantity: string;
  unit_price: string;
  discount: string;
  total: string;
  created_at: Date;
}

@Injectable()
export class GetQuoteUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, quoteId: string): Promise<QuoteEntity> {
    const result = await this.db.withRls(context, async (client) => {
      const [quote] = await client.query<QuoteRow>(
        `SELECT id, org_id, branch_id, customer_id, quote_number, status, valid_until, subtotal, discount_total, tax_total, total, notes,
                client_name, client_phone, client_email, client_company, client_nit, client_address,
                created_at, updated_at
         FROM quotes
         WHERE id = $1 AND deleted_at IS NULL`,
        [quoteId],
      );

      if (!quote) {
        return null;
      }

      const items = await client.query<QuoteItemRow>(
        `SELECT qi.id, qi.org_id, qi.quote_id, qi.product_id, qi.kit_id, k.name AS kit_name,
                p.name AS product_name, p.sku AS product_sku, p.unit AS product_unit,
                qi.quantity, qi.unit_price, qi.discount, qi.total, qi.created_at
         FROM quote_items qi
         LEFT JOIN kits k ON k.id = qi.kit_id
         LEFT JOIN products p ON p.id = qi.product_id
         WHERE qi.quote_id = $1
         ORDER BY qi.created_at ASC`,
        [quoteId],
      );

      return { quote, items };
    });

    if (!result) {
      throw new NotFoundException('Quote not found');
    }

    const quote = result.quote;
    const items: QuoteItemEntity[] = result.items.map((item) => ({
      id: item.id,
      orgId: item.org_id,
      quoteId: item.quote_id,
      productId: item.product_id,
      kitId: item.kit_id,
      kitName: item.kit_name,
      productName: item.product_name,
      productSku: item.product_sku,
      productUnit: item.product_unit,
      quantity: toNumber(item.quantity),
      unitPrice: toNumber(item.unit_price),
      discount: toNumber(item.discount),
      total: toNumber(item.total),
      createdAt: item.created_at.toISOString(),
    }));

    return {
      id: quote.id,
      orgId: quote.org_id,
      branchId: quote.branch_id,
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
      clientCompany: quote.client_company ?? null,
      clientNit: quote.client_nit ?? null,
      clientAddress: quote.client_address ?? null,
      createdAt: quote.created_at.toISOString(),
      updatedAt: quote.updated_at.toISOString(),
      items,
    };
  }
}
