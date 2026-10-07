import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import {
  assertPricesWithinRange,
  isWithinRange,
  type PriceRange,
  type PriceRangeViolation,
} from '../../../../../common/pricing/price-range';
import { SaleEntity } from '../../domain/entities/sale.entity';
import { SaleItemEntity } from '../../domain/entities/sale-item.entity';
import { CreateSaleDto } from '../../presentation/dto/create-sale.dto';
import {
  applyStockDecrementAndRecordMovement,
  resolveKitPricing,
  resolveLineStockImpacts,
  SaleStockLine,
} from '../sale-stock-helpers';
import { assertInvoiceCustomerData, issueInvoice } from '../invoice-helpers';

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
  client_name: string | null;
  client_nit: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_address: string | null;
  payment_method: string | null;
  sold_by: string | null;
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
  kit_id: string | null;
  quantity: string;
  unit_price: string;
  unit_cost: string;
  discount: string;
  total: string;
  total_cost: string;
  created_at: Date;
}

interface ProductPriceRow {
  id: string;
  name: string;
  sale_price: string;
  cost_price: string | null;
  min_sale_price: string | null;
  max_sale_price: string | null;
}

@Injectable()
export class CreateSaleUseCase {
  constructor(private readonly db: DbService) {}

  async execute(
    context: RlsContext,
    userId: string,
    dto: CreateSaleDto,
    canOverridePrice = false,
  ): Promise<SaleEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    for (const item of dto.items) {
      if (Boolean(item.productId) === Boolean(item.kitId)) {
        throw new BadRequestException('Cada linea debe tener exactamente un producto o un kit');
      }
    }

    const isAdvanceSale = dto.status === 'pending_delivery';
    const wantsInvoice = dto.documentType === 'invoice';

    // Una venta adelantada se cobra en dos tiempos: facturar el total antes de
    // cobrar el saldo dejaria la factura desalineada con lo cobrado. Se factura
    // al entregar, desde el historial.
    if (wantsInvoice && isAdvanceSale) {
      throw new BadRequestException(
        'Una venta con entrega pendiente se factura al entregarla, no al reservarla',
      );
    }

    if (isAdvanceSale) {
      const hasDeposit = (dto.payments ?? []).some((p) => p.amount > 0);
      if (!hasDeposit) {
        throw new BadRequestException(
          'Una venta con entrega pendiente requiere al menos un pago inicial (anticipo)',
        );
      }
    }

    // Precio efectivo por sucursal (override de sucursal con fallback al precio global)
    const productIds = Array.from(
      new Set(dto.items.filter((item) => item.productId).map((item) => item.productId as string)),
    );
    const kitIds = Array.from(
      new Set(dto.items.filter((item) => item.kitId).map((item) => item.kitId as string)),
    );

    const priceMap = new Map<
      string,
      { name: string; salePrice: number; costPrice: number; range: PriceRange }
    >();
    if (productIds.length > 0) {
      const products = await this.db.withRls(context, (client) =>
        client.query<ProductPriceRow>(
          // El rango se resuelve campo a campo, igual que el precio: el limite
          // de la sucursal si lo hay, si no el global.
          `SELECT p.id, p.name,
                  COALESCE(pbp.sale_price, p.sale_price) AS sale_price,
                  COALESCE(pbp.cost_price, p.cost_price) AS cost_price,
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
        priceMap.set(product.id, {
          name: product.name,
          salePrice: toNumber(product.sale_price),
          costPrice: toNumber(product.cost_price),
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

    // Antes esto aceptaba cualquier unitPrice que llegara en el cuerpo, asi que
    // con un curl se podia vender un producto de 5000 Bs en 1 Bs. Ahora cada
    // linea con precio manual se contrasta con el rango autorizado; salirse
    // exige el permiso sales.price_override.
    const priceViolations: PriceRangeViolation[] = [];

    const itemsInput = dto.items.map((item) => {
      const effective = item.productId ? priceMap.get(item.productId) : kitPriceMap.get(item.kitId!);
      const unitPrice = item.unitPrice ?? effective?.salePrice ?? 0;

      const range = item.productId ? priceMap.get(item.productId)?.range : undefined;
      if (range && !isWithinRange(unitPrice, range)) {
        priceViolations.push({
          label: priceMap.get(item.productId!)?.name ?? item.productId!,
          unitPrice,
          min: range.min,
          max: range.max,
        });
      }

      const unitCost = item.unitCost ?? (item.productId ? effective?.costPrice : effective?.unitCost) ?? 0;
      const discount = item.discount ?? 0;
      const lineSubtotal = item.quantity * unitPrice;
      const total = lineSubtotal - discount;
      const totalCost = item.quantity * unitCost;
      return {
        productId: item.productId ?? null,
        kitId: item.kitId ?? null,
        purchaseOrderId: item.purchaseOrderId ?? null,
        quantity: item.quantity,
        unitPrice,
        unitCost,
        discount,
        total,
        totalCost,
      };
    });

    assertPricesWithinRange(priceViolations, canOverridePrice);

    const subtotal = itemsInput.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    const discountTotal = itemsInput.reduce((acc, item) => acc + item.discount, 0);
    const taxTotal = dto.taxTotal ?? 0;
    const total = subtotal - discountTotal + taxTotal;
    const costTotal = itemsInput.reduce((acc, item) => acc + item.totalCost, 0);

    if (isAdvanceSale) {
      const depositTotal = (dto.payments ?? []).reduce((sum, p) => sum + p.amount, 0);
      if (depositTotal > total) {
        throw new BadRequestException('El anticipo no puede ser mayor al total de la venta');
      }
    }

    const result = await this.db.withRls(context, async (client) => {
      // Una factura necesita a quien se le emite. Si la venta es a un cliente
      // registrado los datos fiscales salen de su ficha; si es ocasional, de lo
      // que capturo el punto de venta.
      if (wantsInvoice) {
        let invoiceName = dto.clientName;
        let invoiceNit = dto.clientNit;

        if (dto.customerId) {
          const [customer] = await client.query<{ name: string; tax_id: string | null }>(
            `SELECT name, tax_id FROM customers WHERE id = $1 AND deleted_at IS NULL`,
            [dto.customerId],
          );
          invoiceName = customer?.name ?? invoiceName;
          invoiceNit = customer?.tax_id ?? invoiceNit;
        }

        assertInvoiceCustomerData(invoiceName, invoiceNit);
      }

      // Venta adelantada: si una linea de producto no tiene stock suficiente, debe
      // reservarse contra una orden de compra abierta con cantidad disponible. Se valida
      // dentro de la misma transaccion del insert, con FOR UPDATE sobre la linea de OC,
      // para evitar que dos ventas concurrentes sobre-reserven el mismo lote.
      if (isAdvanceSale) {
        for (const item of dto.items) {
          if (!item.productId) continue; // los kits no se validan contra OC en esta fase

          const [stock] = await client.query<{ quantity_on_hand: string }>(
            `SELECT quantity_on_hand FROM inventory_stock WHERE org_id = $1 AND branch_id = $2 AND product_id = $3`,
            [orgId, dto.branchId, item.productId],
          );
          const currentQty = stock ? toNumber(stock.quantity_on_hand) : 0;
          if (currentQty >= item.quantity) continue;

          if (!item.purchaseOrderId) {
            throw new BadRequestException(
              'No se puede reservar: no hay orden de compra abierta indicada para un producto sin stock suficiente',
            );
          }

          const [po] = await client.query<{ ordered_qty: string; reserved_qty: string }>(
            `SELECT poi.quantity AS ordered_qty,
                    COALESCE((
                      SELECT SUM(si.quantity)
                      FROM sale_items si
                      JOIN sales s ON s.id = si.sale_id
                      WHERE si.purchase_order_id = po.id
                        AND si.product_id = poi.product_id
                        AND s.status = 'pending_delivery'
                    ), 0) AS reserved_qty
             FROM purchase_orders po
             JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
             WHERE po.id = $1 AND po.org_id = $2 AND po.branch_id = $3 AND poi.product_id = $4
               AND po.status NOT IN ('received', 'canceled') AND po.deleted_at IS NULL
             FOR UPDATE OF poi`,
            [item.purchaseOrderId, orgId, dto.branchId, item.productId],
          );

          if (!po) {
            throw new BadRequestException(
              'La orden de compra indicada no esta abierta o no contiene este producto en esta sucursal',
            );
          }

          const availableQty = toNumber(po.ordered_qty) - toNumber(po.reserved_qty);
          if (availableQty < item.quantity) {
            throw new BadRequestException(
              'La orden de compra no tiene cantidad disponible suficiente para reservar',
            );
          }
        }
      }

      const [sale] = await client.query<SaleRow>(
        `INSERT INTO sales (
           org_id,
           branch_id,
           customer_id,
           quote_id,
           sale_number,
           status,
           sold_at,
           subtotal,
           discount_total,
           tax_total,
           total,
           cost_total,
           client_name,
           client_nit,
           client_phone,
           client_email,
           client_address,
           payment_method,
           sold_by,
           document_type
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
         RETURNING id, org_id, branch_id, customer_id, quote_id, sale_number, status, sold_at,
                   subtotal, discount_total, tax_total, total, cost_total,
                   client_name, client_nit, client_phone, client_email, client_address,
                   payment_method, sold_by, voided_at, delivered_at, document_type, created_at, updated_at`,
        [
          orgId,
          dto.branchId,
          dto.customerId ?? null,
          dto.quoteId ?? null,
          dto.saleNumber,
          dto.status ?? 'completed',
          dto.soldAt ? new Date(dto.soldAt) : new Date(),
          subtotal,
          discountTotal,
          taxTotal,
          total,
          costTotal,
          dto.clientName?.trim() || null,
          dto.clientNit?.trim().toUpperCase() || null,
          dto.clientPhone?.trim() || null,
          dto.clientEmail?.trim() || null,
          dto.clientAddress?.trim() || null,
          dto.paymentMethod ?? null,
          userId,
          wantsInvoice ? 'invoice' : 'receipt',
        ],
      );

      const items: SaleItemEntity[] = [];
      for (const item of itemsInput) {
        const [created] = await client.query<SaleItemRow>(
          `INSERT INTO sale_items (org_id, sale_id, product_id, kit_id, purchase_order_id, quantity, unit_price, unit_cost, discount, total, total_cost)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id, org_id, sale_id, product_id, kit_id, quantity, unit_price, unit_cost, discount, total, total_cost, created_at`,
          [
            orgId,
            sale.id,
            item.productId,
            item.kitId,
            item.purchaseOrderId,
            item.quantity,
            item.unitPrice,
            item.unitCost,
            item.discount,
            item.total,
            item.totalCost,
          ],
        );

        items.push({
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

      if (dto.paymentMethod) {
        await client.execute(
          `INSERT INTO payments (org_id, sale_id, amount, method, status, paid_at)
           VALUES ($1, $2, $3, $4, 'completed', now())`,
          [orgId, sale.id, total, dto.paymentMethod === 'credit' ? 'other' : dto.paymentMethod],
        );
      }

      if (dto.payments) {
        for (const payment of dto.payments) {
          await client.execute(
            `INSERT INTO payments (org_id, sale_id, amount, method, status, paid_at)
             VALUES ($1, $2, $3, $4, 'completed', $5)`,
            [
              orgId,
              sale.id,
              payment.amount,
              payment.method === 'credit' ? 'other' : payment.method,
              payment.paidAt ? new Date(payment.paidAt) : new Date(),
            ],
          );
        }
      }

      if (!isAdvanceSale) {
        const stockLines: SaleStockLine[] = await resolveLineStockImpacts(
          client,
          itemsInput.map((item) => ({
            productId: item.productId,
            kitId: item.kitId,
            quantity: item.quantity,
          })),
        );
        await applyStockDecrementAndRecordMovement(client, orgId, dto.branchId, sale.id, stockLines);
      }

      // Dentro de la misma transaccion a proposito: con una segunda llamada, un
      // fallo de red dejaria una venta marcada "con factura" sin factura, y el
      // punto de venta ya habria limpiado el carrito e impreso.
      const invoice = wantsInvoice
        ? await issueInvoice(client, orgId, sale.id, { subtotal, taxTotal, total })
        : null;

      return { sale, items, invoice };
    });

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
      clientName: sale.client_name ?? null,
      clientNit: sale.client_nit ?? null,
      clientPhone: sale.client_phone ?? null,
      clientEmail: sale.client_email ?? null,
      clientAddress: sale.client_address ?? null,
      paymentMethod: (sale.payment_method as SaleEntity['paymentMethod']) ?? null,
      soldBy: sale.sold_by ?? null,
      voidedAt: sale.voided_at ? sale.voided_at.toISOString() : null,
      deliveredAt: sale.delivered_at ? sale.delivered_at.toISOString() : null,
      documentType: sale.document_type as SaleEntity['documentType'],
      createdAt: sale.created_at.toISOString(),
      updatedAt: sale.updated_at.toISOString(),
      items: result.items,
      invoice: result.invoice,
      invoiceNumber: result.invoice?.invoiceNumber ?? null,
      invoiceStatus: result.invoice?.status ?? null,
    };
  }
}
