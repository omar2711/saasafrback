import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { PurchaseOrderEntity } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderItemEntity } from '../../domain/entities/purchase-order-item.entity';
import { CreatePurchaseOrderDto } from '../../presentation/dto/create-purchase-order.dto';

interface PurchaseOrderRow {
  id: string;
  org_id: string;
  branch_id: string;
  supplier_id: string;
  order_number: string;
  status: string;
  ordered_at: Date | null;
  received_at: Date | null;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total_cost: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ProductIdRow {
  id: string;
}

interface PurchaseOrderItemRow {
  id: string;
  org_id: string;
  purchase_order_id: string;
  product_id: string;
  quantity: string;
  unit_cost: string;
  total_cost: string;
  created_at: Date;
}

@Injectable()
export class CreatePurchaseOrderUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, dto: CreatePurchaseOrderDto): Promise<PurchaseOrderEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    for (const item of dto.items) {
      if (!item.productId && !(item.productName && item.sku)) {
        throw new BadRequestException(
          'Each item requires productId or both productName and sku',
        );
      }
    }

    const itemsInput = dto.items.map((item) => ({
      ...item,
      totalCost: item.quantity * item.unitCost,
    }));

    const subtotal = itemsInput.reduce((acc, item) => acc + item.totalCost, 0);
    const discountTotal = dto.discountTotal ?? 0;
    const taxTotal = dto.taxTotal ?? 0;
    const totalCost = subtotal - discountTotal + taxTotal;

    const result = await this.db.withRls(context, async (client) => {
      const [order] = await client.query<PurchaseOrderRow>(
        `INSERT INTO purchase_orders (
           org_id,
           branch_id,
           supplier_id,
           order_number,
           status,
           ordered_at,
           subtotal,
           discount_total,
           tax_total,
           total_cost,
           notes
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, org_id, branch_id, supplier_id, order_number, status, ordered_at, received_at, subtotal, discount_total, tax_total, total_cost, notes, created_at, updated_at`,
        [
          orgId,
          dto.branchId,
          dto.supplierId,
          dto.orderNumber,
          dto.status ?? 'draft',
          dto.orderedAt ? new Date(dto.orderedAt) : null,
          subtotal,
          discountTotal,
          taxTotal,
          totalCost,
          dto.notes ?? null,
        ],
      );

      const items: PurchaseOrderItemEntity[] = [];
      for (const item of itemsInput) {
        let productId = item.productId;
        if (!productId) {
          const [newProduct] = await client.query<ProductIdRow>(
            `INSERT INTO products (org_id, sku, name, category, sale_price, cost_price, unit, status)
             VALUES ($1, $2, $3, $4, 0, $5, $6, 'pending_pricing')
             RETURNING id`,
            [orgId, item.sku, item.productName, item.category ?? null, item.unitCost, item.unit ?? 'unidad'],
          );
          productId = newProduct.id;
        }

        const [created] = await client.query<PurchaseOrderItemRow>(
          `INSERT INTO purchase_order_items (org_id, purchase_order_id, product_id, quantity, unit_cost, total_cost)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, org_id, purchase_order_id, product_id, quantity, unit_cost, total_cost, created_at`,
          [orgId, order.id, productId, item.quantity, item.unitCost, item.totalCost],
        );

        items.push({
          id: created.id,
          orgId: created.org_id,
          purchaseOrderId: created.purchase_order_id,
          productId: created.product_id,
          quantity: toNumber(created.quantity),
          unitCost: toNumber(created.unit_cost),
          totalCost: toNumber(created.total_cost),
          createdAt: created.created_at.toISOString(),
        });
      }

      return { order, items };
    });

    const order = result.order;
    return {
      id: order.id,
      orgId: order.org_id,
      branchId: order.branch_id,
      supplierId: order.supplier_id,
      orderNumber: order.order_number,
      status: order.status as PurchaseOrderEntity['status'],
      orderedAt: order.ordered_at ? order.ordered_at.toISOString() : null,
      receivedAt: order.received_at ? order.received_at.toISOString() : null,
      subtotal: toNumber(order.subtotal),
      discountTotal: toNumber(order.discount_total),
      taxTotal: toNumber(order.tax_total),
      totalCost: toNumber(order.total_cost),
      notes: order.notes ?? null,
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
      items: result.items,
    };
  }
}
