import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { PurchaseOrderEntity } from '../../domain/entities/purchase-order.entity';
import { UpdatePurchaseOrderDto } from '../../presentation/dto/update-purchase-order.dto';

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

@Injectable()
export class UpdatePurchaseOrderUseCase {
  constructor(private readonly db: DbService) {}

  async execute(
    context: RlsContext,
    orderId: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderEntity> {
    const orders = await this.db.withRls(context, (client) =>
      client.query<PurchaseOrderRow>(
        `UPDATE purchase_orders
         SET status = COALESCE($1::text, status),
           ordered_at = COALESCE($2::timestamptz, ordered_at),
           received_at = COALESCE($3::timestamptz, received_at),
           discount_total = COALESCE($4::numeric, discount_total),
           tax_total = COALESCE($5::numeric, tax_total),
           total_cost = subtotal - COALESCE($4::numeric, discount_total) + COALESCE($5::numeric, tax_total),
           notes = COALESCE($6::text, notes)
         WHERE id = $7 AND deleted_at IS NULL
         RETURNING id, org_id, branch_id, supplier_id, order_number, status, ordered_at, received_at, subtotal, discount_total, tax_total, total_cost, notes, created_at, updated_at`,
        [
          dto.status ?? null,
          dto.orderedAt ? new Date(dto.orderedAt) : null,
          dto.receivedAt ? new Date(dto.receivedAt) : null,
          dto.discountTotal ?? null,
          dto.taxTotal ?? null,
          dto.notes ?? null,
          orderId,
        ],
      ),
    );

    if (!orders[0]) {
      throw new NotFoundException('Purchase order not found');
    }

    const order = orders[0];
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
    };
  }
}
