import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import {
  assertPricesWithinRange,
  isWithinRange,
  type PriceRange,
  type PriceRangeViolation,
} from '../../../../../common/pricing/price-range';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { resolveKitPricing } from '../../../sales/application/sale-stock-helpers';
import { QuoteEntity } from '../../domain/entities/quote.entity';
import { QuoteItemEntity } from '../../domain/entities/quote-item.entity';
import { CreateQuoteDto } from '../../presentation/dto/create-quote.dto';

interface ProductPriceRow {
  id: string;
  name: string;
  sale_price: string;
  min_sale_price: string | null;
  max_sale_price: string | null;
}

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
  quantity: string;
  unit_price: string;
  discount: string;
  total: string;
  created_at: Date;
}

@Injectable()
export class CreateQuoteUseCase {
  constructor(private readonly db: DbService) {}

  async execute(
    context: RlsContext,
    dto: CreateQuoteDto,
    canOverridePrice = false,
  ): Promise<QuoteEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    for (const item of dto.items) {
      if (Boolean(item.productId) === Boolean(item.kitId)) {
        throw new BadRequestException('Cada linea debe tener exactamente un producto o un kit');
      }
    }

    // Precio efectivo por sucursal (override de sucursal con fallback al precio global)
    const productIds = Array.from(
      new Set(dto.items.filter((item) => item.productId).map((item) => item.productId as string)),
    );
    const kitIds = Array.from(
      new Set(dto.items.filter((item) => item.kitId).map((item) => item.kitId as string)),
    );

    const priceMap = new Map<string, number>();
    const rangeMap = new Map<string, { name: string; range: PriceRange }>();
    if (productIds.length > 0) {
      const products = await this.db.withRls(context, (client) =>
        client.query<ProductPriceRow>(
          `SELECT p.id, p.name,
                  COALESCE(pbp.sale_price, p.sale_price) AS sale_price,
                  COALESCE(pbp.min_sale_price, p.min_sale_price) AS min_sale_price,
                  COALESCE(pbp.max_sale_price, p.max_sale_price) AS max_sale_price
           FROM products p
           LEFT JOIN product_branch_prices pbp
             ON pbp.product_id = p.id AND pbp.branch_id = $2::uuid
           WHERE p.id = ANY($1::uuid[])`,
          [productIds, dto.branchId],
        ),
      );
      for (const product of products) {
        priceMap.set(product.id, toNumber(product.sale_price));
        rangeMap.set(product.id, {
          name: product.name,
          range: {
            min: product.min_sale_price === null ? null : toNumber(product.min_sale_price),
            max: product.max_sale_price === null ? null : toNumber(product.max_sale_price),
          },
        });
      }
    }

    const kitPriceMap =
      kitIds.length > 0
        ? await this.db.withRls(context, (client) => resolveKitPricing(client, kitIds))
        : new Map();

    // Mismo limite que en la venta: una cotizacion se convierte en venta con un
    // clic, asi que dejar cotizar fuera de rango solo aplazaria el problema.
    const priceViolations: PriceRangeViolation[] = [];

    const itemsInput = dto.items.map((item) => {
      const unitPrice =
        item.unitPrice ??
        (item.productId ? priceMap.get(item.productId) : kitPriceMap.get(item.kitId!)?.salePrice) ??
        0;

      const entry = item.productId ? rangeMap.get(item.productId) : undefined;
      if (entry && !isWithinRange(unitPrice, entry.range)) {
        priceViolations.push({
          label: entry.name,
          unitPrice,
          min: entry.range.min,
          max: entry.range.max,
        });
      }

      const itemSubtotal = item.quantity * unitPrice;
      const itemDiscount = item.discount ?? 0;
      return {
        productId: item.productId ?? null,
        kitId: item.kitId ?? null,
        quantity: item.quantity,
        unitPrice,
        discount: itemDiscount,
        total: itemSubtotal - itemDiscount,
      };
    });

    assertPricesWithinRange(priceViolations, canOverridePrice);

    const subtotal = itemsInput.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const discountTotal = (dto.discountTotal ?? 0) + itemsInput.reduce((acc, item) => acc + item.discount, 0);
    const taxTotal = dto.taxTotal ?? 0;
    const total = subtotal - discountTotal + taxTotal;

    const result = await this.db.withRls(context, async (client) => {
      const [quote] = await client.query<QuoteRow>(
        `INSERT INTO quotes (
           org_id,
           branch_id,
           customer_id,
           quote_number,
           status,
           valid_until,
           subtotal,
           discount_total,
           tax_total,
           total,
           notes,
           client_name,
           client_phone,
           client_email,
           client_company,
           client_nit,
           client_address
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         RETURNING id, org_id, branch_id, customer_id, quote_number, status, valid_until, subtotal, discount_total, tax_total, total, notes, client_name, client_phone, client_email, client_company, client_nit, client_address, created_at, updated_at`,
        [
          orgId,
          dto.branchId,
          dto.customerId ?? null,
          dto.quoteNumber,
          dto.status ?? 'pending',
          dto.validUntil ? new Date(dto.validUntil) : null,
          subtotal,
          discountTotal,
          taxTotal,
          total,
          dto.notes ?? null,
          dto.clientName ?? null,
          dto.clientPhone ?? null,
          dto.clientEmail ?? null,
          dto.clientCompany ?? null,
          dto.clientNit ?? null,
          dto.clientAddress ?? null,
        ],
      );

      const items: QuoteItemEntity[] = [];
      for (const item of itemsInput) {
        const [created] = await client.query<QuoteItemRow>(
          `INSERT INTO quote_items (org_id, quote_id, product_id, kit_id, quantity, unit_price, discount, total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING id, org_id, quote_id, product_id, kit_id, quantity, unit_price, discount, total, created_at`,
          [
            orgId,
            quote.id,
            item.productId,
            item.kitId,
            item.quantity,
            item.unitPrice,
            item.discount,
            item.total,
          ],
        );

        items.push({
          id: created.id,
          orgId: created.org_id,
          quoteId: created.quote_id,
          productId: created.product_id,
          kitId: created.kit_id,
          quantity: toNumber(created.quantity),
          unitPrice: toNumber(created.unit_price),
          discount: toNumber(created.discount),
          total: toNumber(created.total),
          createdAt: created.created_at.toISOString(),
        });
      }

      return { quote, items };
    });

    const quote = result.quote;
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
      items: result.items,
    };
  }
}
