import { ForbiddenException, Injectable } from '@nestjs/common';
import { buildPaginationClause, type PaginationFilter } from '../../../../../common/utils/pagination';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { PurchaseOrderEntity } from '../../domain/entities/purchase-order.entity';

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
  item_count: string;
  created_at: Date;
  updated_at: Date;
}

export interface ListPurchaseOrdersFilter extends PaginationFilter {
  branchId?: string;
  supplierId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class ListPurchaseOrdersUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, filter: ListPurchaseOrdersFilter = {}): Promise<PurchaseOrderEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    // Las condiciones van prefijadas con po.: con los JOIN a suppliers/branches
    // columnas como org_id o deleted_at serian ambiguas.
    const conditions: string[] = ['po.org_id = $1', 'po.deleted_at IS NULL'];
    const params: unknown[] = [orgId];

    if (filter.branchId) {
      params.push(filter.branchId);
      conditions.push(`po.branch_id = $${params.length}`);
    }
    if (filter.supplierId) {
      params.push(filter.supplierId);
      conditions.push(`po.supplier_id = $${params.length}`);
    }
    if (filter.status) {
      params.push(filter.status);
      conditions.push(`po.status = $${params.length}`);
    }
    if (filter.dateFrom) {
      params.push(filter.dateFrom);
      conditions.push(`po.created_at >= $${params.length}`);
    }
    if (filter.dateTo) {
      params.push(filter.dateTo);
      conditions.push(`po.created_at <= $${params.length}`);
    }

    const pagination = buildPaginationClause(filter, params);

    const orders = await this.db.withRls(context, (client) =>
      client.query<PurchaseOrderRow>(
        `SELECT po.id, po.org_id, po.branch_id, b.name AS branch_name,
                po.supplier_id, s.name AS supplier_name,
                po.order_number, po.status, po.ordered_at, po.received_at,
                po.subtotal, po.discount_total, po.tax_total, po.total_cost, po.notes,
                po.created_at, po.updated_at,
                (SELECT COUNT(*) FROM purchase_order_items poi
                  WHERE poi.purchase_order_id = po.id) AS item_count
         FROM purchase_orders po
         LEFT JOIN suppliers s ON s.id = po.supplier_id
         LEFT JOIN branches b ON b.id = po.branch_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY po.created_at DESC
         ${pagination}`,
        params,
      ),
    );

    return orders.map((order) => ({
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
      itemCount: toNumber(order.item_count),
      createdAt: order.created_at.toISOString(),
      updatedAt: order.updated_at.toISOString(),
    }));
  }
}
