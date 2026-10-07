import { ForbiddenException, Injectable } from '@nestjs/common';
import { buildPaginationClause, type PaginationFilter } from '../../../../../common/utils/pagination';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNullableNumber, toNumber } from '../../../../../common/utils/numbers';
import { InventoryMovementEntity } from '../../domain/entities/inventory-movement.entity';

interface MovementRow {
  id: string;
  org_id: string;
  branch_id: string;
  branch_name: string | null;
  product_id: string;
  product_name: string | null;
  product_sku: string | null;
  movement_type: string;
  quantity: string;
  unit_cost: string | null;
  total_cost: string | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: Date;
}

export interface ListInventoryMovementsFilter extends PaginationFilter {
  branchId?: string;
  productId?: string;
  movementType?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class ListInventoryMovementsUseCase {
  constructor(private readonly db: DbService) {}

  async execute(
    context: RlsContext,
    filters: ListInventoryMovementsFilter,
  ): Promise<InventoryMovementEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const where: string[] = ['m.org_id = $1'];
    const params: unknown[] = [orgId];
    let index = 2;

    if (filters.branchId) {
      where.push(`m.branch_id = $${index}`);
      params.push(filters.branchId);
      index += 1;
    }

    if (filters.productId) {
      where.push(`m.product_id = $${index}`);
      params.push(filters.productId);
      index += 1;
    }

    if (filters.movementType) {
      where.push(`m.movement_type = $${index}`);
      params.push(filters.movementType);
      index += 1;
    }

    if (filters.dateFrom) {
      where.push(`m.created_at >= $${index}`);
      params.push(filters.dateFrom);
      index += 1;
    }

    if (filters.dateTo) {
      where.push(`m.created_at <= $${index}`);
      params.push(filters.dateTo);
      index += 1;
    }

    const pagination = buildPaginationClause(filters, params);

    const rows = await this.db.withRls(context, (client) =>
      client.query<MovementRow>(
        `SELECT m.id, m.org_id, m.branch_id, b.name AS branch_name,
                m.product_id, p.name AS product_name, p.sku AS product_sku,
                m.movement_type, m.quantity, m.unit_cost, m.total_cost,
                m.reference_type, m.reference_id, m.notes,
                m.created_by, u.full_name AS created_by_name, m.created_at
         FROM inventory_movements m
         LEFT JOIN branches b ON b.id = m.branch_id
         LEFT JOIN products p ON p.id = m.product_id
         LEFT JOIN users u ON u.id = m.created_by
         WHERE ${where.join(' AND ')}
         ORDER BY m.created_at DESC
         ${pagination}`,
        params,
      ),
    );

    return rows.map((row) => ({
      id: row.id,
      orgId: row.org_id,
      branchId: row.branch_id,
      branchName: row.branch_name ?? null,
      productId: row.product_id,
      productName: row.product_name ?? null,
      productSku: row.product_sku ?? null,
      movementType: row.movement_type as InventoryMovementEntity['movementType'],
      quantity: toNumber(row.quantity),
      unitCost: toNullableNumber(row.unit_cost),
      totalCost: toNullableNumber(row.total_cost),
      referenceType: row.reference_type ?? null,
      referenceId: row.reference_id ?? null,
      notes: row.notes ?? null,
      createdBy: row.created_by ?? null,
      createdByName: row.created_by_name ?? null,
      createdAt: row.created_at.toISOString(),
    }));
  }
}
