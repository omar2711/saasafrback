import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { PurchaseOrderEntity } from '../../domain/entities/purchase-order.entity';
import { PurchaseOrderItemEntity } from '../../domain/entities/purchase-order-item.entity';

interface PurchaseOrderRow {
  id: string;
  org_id: string;
  branch_id: string;
  branch_name: string | null;
  supplier_id: string;
  supplier_name: string | null;
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
  product_name: string | null;
  product_sku: string | null;
  product_unit: string | null;
  quantity: string;
  unit_cost: string;
  total_cost: string;
  created_at: Date;
}

@Injectable()
export class GetPurchaseOrderUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, orderId: string): Promise<PurchaseOrderEntity> {
    const result = await this.db.withRls(context, async (client) => {
      const [order] = await client.query<PurchaseOrderRow>(
        `SELECT po.id, po.org_id, po.branch_id, b.name AS branch_name,
                po.supplier_id, s.name AS supplier_name,
                po.order_number, po.status, po.ordered_at, po.received_at,
                po.subtotal, po.discount_total, po.tax_total, po.total_cost, po.notes,
                po.created_at, po.updated_at
         FROM purchase_orders po
         LEFT JOIN suppliers s ON s.id = po.supplier_id
         LEFT JOIN branches b ON b.id = po.branch_id
         WHERE po.id = $1 AND po.deleted_at IS NULL`,
        [orderId],
      );

      if (!order) {
        return null;
      }

      const items = await client.query<PurchaseOrderItemRow>(
        `SELECT poi.id, poi.org_id, poi.purchase_order_id, poi.product_id,
                p.name AS product_name, p.sku AS product_sku, p.unit AS product_unit,
                poi.quantity, poi.unit_cost, poi.total_cost, poi.created_at
         FROM purchase_order_items poi
         LEFT JOIN products p ON p.id = poi.product_id
         WHERE poi.purchase_order_id = $1
         ORDER BY poi.created_at ASC`,
        [orderId],
      );

      return { order, items };
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
      productName: item.product_name ?? null,
      productSku: item.product_sku ?? null,
      productUnit: item.product_unit ?? null,
      quantity: toNumber(item.quantity),
      unitCost: toNumber(item.unit_cost),
      totalCost: toNumber(item.total_cost),
      createdAt: item.created_at.toISOString(),
    }));

    return {
      id: order.id,
      orgId: order.org_id,
      branchId: order.branch_id,
      branchName: order.branch_name ?? null,
      supplierId: order.supplier_id,
      supplierName: order.supplier_name ?? null,
      orderNumber: order.order_number,
      status: order.status as PurchaseOrderEntity['status'],
      orderedAt: order.ordered_at ? order.ordered_at.toISOString() : null,
      receivedAt: order.received_at ? order.received_at.toISOString() : null,
      subtotal: toNumber(order.subtotal),
      discountTotal: toNumber(order.discount_total),
      taxTotal: toNumber(order.tax_total),
      totalCost: toNumber(order.total_cost),
      notes: order.notes ?? null,
      itemCount: items.length,
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
      items,
    };
  }
}
