import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';

export interface OpenPurchaseOrderLine {
  purchaseOrderId: string;
  orderNumber: string;
  status: string;
  orderedQty: number;
  reservedQty: number;
  availableQty: number;
}

interface Row {
  purchase_order_id: string;
  order_number: string;
  status: string;
  ordered_qty: string;
  reserved_qty: string;
}

@Injectable()
export class ListOpenPoLinesForProductUseCase {
  constructor(private readonly db: DbService) {}

  async execute(
    context: RlsContext,
    productId: string,
    branchId: string,
  ): Promise<OpenPurchaseOrderLine[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const rows = await this.db.withRls(context, (client) =>
      client.query<Row>(
        `SELECT po.id AS purchase_order_id, po.order_number, po.status, poi.quantity AS ordered_qty,
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
         WHERE po.org_id = $1
           AND po.branch_id = $2
           AND poi.product_id = $3
           AND po.status NOT IN ('received', 'canceled')
           AND po.deleted_at IS NULL
         ORDER BY po.created_at ASC`,
        [orgId, branchId, productId],
      ),
    );

    return rows.map((row) => {
      const orderedQty = toNumber(row.ordered_qty);
      const reservedQty = toNumber(row.reserved_qty);
      return {
        purchaseOrderId: row.purchase_order_id,
        orderNumber: row.order_number,
        status: row.status,
        orderedQty,
        reservedQty,
        availableQty: Math.max(0, orderedQty - reservedQty),
      };
    });
  }
}
