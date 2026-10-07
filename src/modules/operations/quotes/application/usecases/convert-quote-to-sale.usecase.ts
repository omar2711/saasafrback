import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import {
  applyStockDecrementAndRecordMovement,
  resolveKitPricing,
  resolveLineStockImpacts,
  SaleStockLine,
} from '../../../sales/application/sale-stock-helpers';
import { SaleEntity } from '../../../sales/domain/entities/sale.entity';
import { SaleItemEntity } from '../../../sales/domain/entities/sale-item.entity';
import { ConvertQuoteToSaleDto } from '../../presentation/dto/convert-quote-to-sale.dto';

interface QuoteRow {
  id: string;
  org_id: string;
  branch_id: string;
  customer_id: string | null;
  quote_number: string;
  status: string;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
}

interface QuoteItemRow {
  id: string;
  product_id: string | null;
  kit_id: string | null;
  quantity: string;
  unit_price: string;
  discount: string;
  total: string;
}

interface ProductCostRow {
  id: string;
  cost_price: string | null;
}

interface SaleRow {
  id: string;
  org_id: string;
  branch_id: string;
  customer_id: string | null;
  quote_id: string | null;
  sale_number: string;
  status: string;
  sold_at: Date;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
  cost_total: string;
  created_at: Date;
  updated_at: Date;
}

interface SaleItemRow {
  id: string;
  org_id: string;
  sale_id: string;
  product_id: string | null;
  kit_id: string | null;
  quantity: string;
  unit_price: string;
  unit_cost: string;
  discount: string;
  total: string;
  total_cost: string;
  created_at: Date;
}

@Injectable()
export class ConvertQuoteToSaleUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, quoteId: string, dto: ConvertQuoteToSaleDto): Promise<SaleEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new BadRequestException('Tenant context missing');
    }

    const result = await this.db.withRls(context, async (client) => {
      const [quote] = await client.query<QuoteRow>(
        `SELECT id, org_id, branch_id, customer_id, quote_number, status,
                subtotal, discount_total, tax_total, total
         FROM quotes
         WHERE id = $1 AND deleted_at IS NULL`,
        [quoteId],
      );

      if (!quote) {
        return null;
      }

      if (quote.status === 'rejected' || quote.status === 'expired') {
        throw new BadRequestException(`No se puede convertir una cotizacion en estado "${quote.status}"`);
      }

      const quoteItems = await client.query<QuoteItemRow>(
        `SELECT id, product_id, kit_id, quantity, unit_price, discount, total
         FROM quote_items
         WHERE quote_id = $1`,
        [quoteId],
      );

      if (quoteItems.length === 0) {
        throw new BadRequestException('La cotizacion no tiene items');
      }

      const productIds = quoteItems.filter((i) => i.product_id).map((i) => i.product_id as string);
      const costs =
        productIds.length > 0
          ? await client.query<ProductCostRow>(
              `SELECT id, cost_price FROM products WHERE id = ANY($1::uuid[])`,
              [productIds],
            )
          : [];
      const costMap = new Map(costs.map((p) => [p.id, toNumber(p.cost_price)]));

      const kitIds = Array.from(
        new Set(quoteItems.filter((i) => i.kit_id).map((i) => i.kit_id as string)),
      );
      const kitPriceMap = kitIds.length > 0 ? await resolveKitPricing(client, kitIds) : new Map();

      const branchId = dto.branchId ?? quote.branch_id;
      const subtotal = toNumber(quote.subtotal);
      const discountTotal = toNumber(quote.discount_total);
      const taxTotal = toNumber(quote.tax_total);
      const total = toNumber(quote.total);

      const itemsInput = quoteItems.map((item) => {
        const qty = toNumber(item.quantity);
        const unitPrice = toNumber(item.unit_price);
        const discount = toNumber(item.discount);
        const unitCost = item.product_id
          ? costMap.get(item.product_id) ?? 0
          : kitPriceMap.get(item.kit_id!)?.unitCost ?? 0;
        return {
          productId: item.product_id,
          kitId: item.kit_id,
          quantity: qty,
          unitPrice,
          unitCost,
          discount,
          total: toNumber(item.total),
          totalCost: qty * unitCost,
        };
      });

      const costTotal = itemsInput.reduce((acc, i) => acc + i.totalCost, 0);

      const [sale] = await client.query<SaleRow>(
        `INSERT INTO sales (
           org_id, branch_id, customer_id, quote_id, sale_number, status,
           sold_at, subtotal, discount_total, tax_total, total, cost_total
         )
         VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, $8, $9, $10, $11)
         RETURNING id, org_id, branch_id, customer_id, quote_id, sale_number, status, sold_at,
                   subtotal, discount_total, tax_total, total, cost_total, created_at, updated_at`,
        [
          orgId,
          branchId,
          quote.customer_id ?? null,
          quoteId,
          dto.saleNumber,
          dto.soldAt ? new Date(dto.soldAt) : new Date(),
          subtotal,
          discountTotal,
          taxTotal,
          total,
          costTotal,
        ],
      );

      const saleItems: SaleItemEntity[] = [];
      for (const item of itemsInput) {
        const [created] = await client.query<SaleItemRow>(
          `INSERT INTO sale_items (org_id, sale_id, product_id, kit_id, quantity, unit_price, unit_cost, discount, total, total_cost)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id, org_id, sale_id, product_id, kit_id, quantity, unit_price, unit_cost, discount, total, total_cost, created_at`,
          [orgId, sale.id, item.productId, item.kitId, item.quantity, item.unitPrice, item.unitCost, item.discount, item.total, item.totalCost],
        );

        saleItems.push({
          id: created.id,
          orgId: created.org_id,
          saleId: created.sale_id,
          productId: created.product_id,
          kitId: created.kit_id,
          quantity: toNumber(created.quantity),
          unitPrice: toNumber(created.unit_price),
          unitCost: toNumber(created.unit_cost),
          discount: toNumber(created.discount),
          total: toNumber(created.total),
          totalCost: toNumber(created.total_cost),
          createdAt: created.created_at.toISOString(),
        });
      }

      const stockLines: SaleStockLine[] = await resolveLineStockImpacts(
        client,
        itemsInput.map((item) => ({
          productId: item.productId,
          kitId: item.kitId,
          quantity: item.quantity,
        })),
      );
      await applyStockDecrementAndRecordMovement(client, orgId, branchId, sale.id, stockLines);

      await client.execute(
        `UPDATE quotes SET status = 'approved' WHERE id = $1`,
        [quoteId],
      );

      return { sale, saleItems };
    });

    if (!result) {
      throw new NotFoundException('Cotizacion no encontrada');
    }

    const sale = result.sale;
    return {
      id: sale.id,
      orgId: sale.org_id,
      branchId: sale.branch_id,
      customerId: sale.customer_id ?? null,
      quoteId: sale.quote_id ?? null,
      saleNumber: sale.sale_number,
      status: sale.status as SaleEntity['status'],
      soldAt: sale.sold_at.toISOString(),
      subtotal: toNumber(sale.subtotal),
      discountTotal: toNumber(sale.discount_total),
      taxTotal: toNumber(sale.tax_total),
      total: toNumber(sale.total),
      costTotal: toNumber(sale.cost_total),
      createdAt: sale.created_at.toISOString(),
      updatedAt: sale.updated_at.toISOString(),
      items: result.saleItems,
    };
  }
}
