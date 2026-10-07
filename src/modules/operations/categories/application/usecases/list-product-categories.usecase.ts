import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { ProductCategoryEntity } from '../../domain/entities/product-category.entity';
import { ListProductCategoriesDto } from '../../presentation/dto/list-product-categories.dto';

interface CategoryRow {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: string;
  product_count: string;
  product_count_in_branch: string | null;
  stock_in_branch: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ListProductCategoriesUseCase {
  constructor(private readonly db: DbService) {}

  async execute(
    context: RlsContext,
    query: ListProductCategoriesDto,
  ): Promise<ProductCategoryEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const branchId = query.branchId ?? null;

    const rows = await this.db.withRls(context, (client) =>
      client.query<CategoryRow>(
        `SELECT
           pc.id,
           pc.org_id,
           pc.name,
           pc.description,
           pc.status,
           pc.created_at,
           pc.updated_at,
           COUNT(DISTINCT p.id) AS product_count,
           COUNT(DISTINCT p.id) FILTER (WHERE $2::uuid IS NOT NULL AND ist.id IS NOT NULL) AS product_count_in_branch,
           COALESCE(SUM(ist.quantity_on_hand) FILTER (WHERE $2::uuid IS NOT NULL), 0) AS stock_in_branch
         FROM product_categories pc
         LEFT JOIN products p
           ON p.category_id = pc.id AND p.deleted_at IS NULL
         LEFT JOIN inventory_stock ist
           ON ist.product_id = p.id AND ist.branch_id = $2::uuid
         WHERE pc.org_id = $1 AND pc.deleted_at IS NULL
         GROUP BY pc.id
         ORDER BY pc.name ASC`,
        [orgId, branchId],
      ),
    );

    return rows.map((row) => ({
      id: row.id,
      orgId: row.org_id,
      name: row.name,
      description: row.description ?? null,
      status: row.status as ProductCategoryEntity['status'],
      productCount: toNumber(row.product_count),
      productCountInBranch: branchId ? toNumber(row.product_count_in_branch) : null,
      stockInBranch: branchId ? toNumber(row.stock_in_branch) : null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  }
}
