import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { InventoryStockEntity } from '../../domain/entities/inventory-stock.entity';

interface StockRow {
  id: string;
  org_id: string;
  branch_id: string;
  product_id: string;
  quantity_on_hand: string;
  min_stock: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ListInventoryStockUseCase {
  constructor(private readonly db: DbService) {}

  async execute(
    context: RlsContext,
    filters: { branchId?: string; productId?: string },
  ): Promise<InventoryStockEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const where: string[] = ['org_id = $1'];
    const params: Array<string> = [orgId];
    let index = 2;

    if (filters.branchId) {
      where.push(`branch_id = $${index}`);
      params.push(filters.branchId);
      index += 1;
    }

    if (filters.productId) {
      where.push(`product_id = $${index}`);
      params.push(filters.productId);
      index += 1;
    }

    const rows = await this.db.withRls(context, (client) =>
      client.query<StockRow>(
        `SELECT id, org_id, branch_id, product_id, quantity_on_hand, min_stock, created_at, updated_at
         FROM inventory_stock
         WHERE ${where.join(' AND ')}
         ORDER BY created_at DESC`,
        params,
      ),
    );

    return rows.map((row) => ({
      id: row.id,
      orgId: row.org_id,
      branchId: row.branch_id,
      productId: row.product_id,
      quantityOnHand: toNumber(row.quantity_on_hand),
      minStock: toNumber(row.min_stock),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  }
}
