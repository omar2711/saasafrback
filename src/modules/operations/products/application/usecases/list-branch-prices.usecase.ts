import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNullableNumber, toNumber } from '../../../../../common/utils/numbers';
import { resolvePriceRange } from '../../../../../common/pricing/price-range';
import { BranchPriceEntity } from '../../domain/entities/branch-price.entity';
import { ListBranchPricesDto } from '../../presentation/dto/list-branch-prices.dto';

interface Row {
  product_id: string;
  sku: string;
  name: string;
  branch_id: string;
  branch_name: string | null;
  global_sale_price: string;
  global_cost_price: string | null;
  branch_sale_price: string | null;
  branch_cost_price: string | null;
  global_min_sale_price: string | null;
  global_max_sale_price: string | null;
  branch_min_sale_price: string | null;
  branch_max_sale_price: string | null;
}

@Injectable()
export class ListBranchPricesUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, query: ListBranchPricesDto): Promise<BranchPriceEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const rows = await this.db.withRls(context, (client) =>
      client.query<Row>(
        `SELECT p.id AS product_id, p.sku, p.name,
                $2::uuid AS branch_id,
                b.name AS branch_name,
                p.sale_price AS global_sale_price,
                p.cost_price AS global_cost_price,
                pbp.sale_price AS branch_sale_price,
                pbp.cost_price AS branch_cost_price,
                p.min_sale_price AS global_min_sale_price,
                p.max_sale_price AS global_max_sale_price,
                pbp.min_sale_price AS branch_min_sale_price,
                pbp.max_sale_price AS branch_max_sale_price
         FROM products p
         LEFT JOIN product_branch_prices pbp
           ON pbp.product_id = p.id AND pbp.branch_id = $2::uuid
         LEFT JOIN branches b ON b.id = $2::uuid
         WHERE p.org_id = $1 AND p.deleted_at IS NULL
         ORDER BY p.name ASC`,
        [orgId, query.branchId],
      ),
    );

    return rows.map((row) => this.map(row));
  }

  private map(row: Row): BranchPriceEntity {
    const globalSale = toNumber(row.global_sale_price);
    const globalCost = toNullableNumber(row.global_cost_price);
    const branchSale = toNullableNumber(row.branch_sale_price);
    const branchCost = toNullableNumber(row.branch_cost_price);
    const range = resolvePriceRange(
      {
        min: toNullableNumber(row.branch_min_sale_price),
        max: toNullableNumber(row.branch_max_sale_price),
      },
      {
        min: toNullableNumber(row.global_min_sale_price),
        max: toNullableNumber(row.global_max_sale_price),
      },
    );
    return {
      productId: row.product_id,
      sku: row.sku,
      name: row.name,
      branchId: row.branch_id,
      branchName: row.branch_name ?? null,
      globalSalePrice: globalSale,
      globalCostPrice: globalCost,
      branchSalePrice: branchSale,
      branchCostPrice: branchCost,
      effectiveSalePrice: branchSale ?? globalSale,
      effectiveCostPrice: branchCost ?? globalCost,
      globalMinSalePrice: toNullableNumber(row.global_min_sale_price),
      globalMaxSalePrice: toNullableNumber(row.global_max_sale_price),
      branchMinSalePrice: toNullableNumber(row.branch_min_sale_price),
      branchMaxSalePrice: toNullableNumber(row.branch_max_sale_price),
      effectiveMinSalePrice: range.min,
      effectiveMaxSalePrice: range.max,
      hasOverride: branchSale !== null || branchCost !== null,
    };
  }
}
