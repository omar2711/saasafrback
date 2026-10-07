import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { PurchaseOrderEntity } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderItemEntity } from '../../domain/entities/purchase-order-item.entity';

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
export class ReceivePurchaseOrderUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, orderId: string): Promise<PurchaseOrderEntity> {
    const result = await this.db.withRls(context, async (client) => {
      const [order] = await client.query<PurchaseOrderRow>(
        `SELECT id, org_id, branch_id, supplier_id, order_number, status, ordered_at, received_at,
                subtotal, discount_total, tax_total, total_cost, notes, created_at, updated_at
         FROM purchase_orders
         WHERE id = $1 AND deleted_at IS NULL`,
        [orderId],
      );

      if (!order) {
        return null;
      }

      if (order.status === 'received') {
        throw new BadRequestException('La orden de compra ya fue recibida');
      }
      if (order.status === 'canceled') {
        throw new BadRequestException('No se puede recibir una orden cancelada');
      }

      const items = await client.query<PurchaseOrderItemRow>(
        `SELECT id, org_id, purchase_order_id, product_id, quantity, unit_cost, total_cost, created_at
         FROM purchase_order_items
         WHERE purchase_order_id = $1`,
        [orderId],
      );

      const [updated] = await client.query<PurchaseOrderRow>(
        `UPDATE purchase_orders
         SET status = 'received', received_at = now()
         WHERE id = $1
         RETURNING id, org_id, branch_id, supplier_id, order_number, status, ordered_at, received_at,
                   subtotal, discount_total, tax_total, total_cost, notes, created_at, updated_at`,
        [orderId],
      );

      for (const item of items) {
        const qty = toNumber(item.quantity);
        const unitCost = toNumber(item.unit_cost);

        await client.execute(
          `INSERT INTO inventory_stock (org_id, branch_id, product_id, quantity_on_hand, min_stock)
           VALUES ($1, $2, $3, $4, 0)
           ON CONFLICT (branch_id, product_id)
           DO UPDATE SET quantity_on_hand = inventory_stock.quantity_on_hand + EXCLUDED.quantity_on_hand`,
          [order.org_id, order.branch_id, item.product_id, qty],
        );

        await client.execute(
          `INSERT INTO inventory_movements (
             org_id, branch_id, product_id, movement_type,
             quantity, unit_cost, total_cost, reference_type, reference_id
           )
           VALUES ($1, $2, $3, 'purchase', $4, $5, $6, 'purchase_order', $7)`,
          [order.org_id, order.branch_id, item.product_id, qty, unitCost, qty * unitCost, orderId],
        );
      }

      return { order: updated, items };
    });

    if (!result) {
      throw new NotFoundException('Orden de compra no encontrada');
    }

    const order = result.order;
    const items: PurchaseOrderItemEntity[] = result.items.map((item) => ({
      id: item.id,
      orgId: item.org_id,
      purchaseOrderId: item.purchase_order_id,
      productId: item.product_id,
      quantity: toNumber(item.quantity),
      unitCost: toNumber(item.unit_cost),
      totalCost: toNumber(item.total_cost),
      createdAt: item.created_at.toISOString(),
    }));

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
      items,
    };
  }
}
