import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNullableNumber, toNumber } from '../../../../../common/utils/numbers';
import { ProductEntity } from '../../domain/entities/product.entity';
import { ListProductsDto } from '../../presentation/dto/list-products.dto';

interface ProductRow {
  id: string;
  org_id: string;
  sku: string;
  name: string;
  category: string | null;
  category_id: string | null;
  description: string | null;
  sale_price: string;
  cost_price: string | null;
  min_sale_price: string | null;
  max_sale_price: string | null;
  unit: string | null;
  image_url: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ListProductsUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, filter: ListProductsDto = {}): Promise<ProductEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const conditions = ['p.org_id = $1', 'p.deleted_at IS NULL'];
    const params: unknown[] = [orgId];
    if (filter.search?.trim()) {
      params.push(`%${filter.search.trim()}%`);
      conditions.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
    }
    if (filter.status) { params.push(filter.status); conditions.push(`p.status = $${params.length}`); }
    params.push(Math.min(filter.limit ?? 200, 500), filter.offset ?? 0);
    const products = await this.db.withRls(context, (client) =>
      client.query<ProductRow>(
        `SELECT p.id, p.org_id, p.sku, p.name,
                COALESCE(pc.name, p.category) AS category,
                p.category_id, p.description, p.sale_price, p.cost_price, p.min_sale_price, p.max_sale_price, p.unit, p.image_url, p.status, p.created_at, p.updated_at
         FROM products p
         LEFT JOIN product_categories pc ON pc.id = p.category_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY p.created_at DESC, p.id DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      ),
    );

    return products.map((product) => ({
      id: product.id,
      orgId: product.org_id,
      sku: product.sku,
      name: product.name,
      category: product.category ?? null,
      categoryId: product.category_id ?? null,
      description: product.description ?? null,
      salePrice: toNumber(product.sale_price),
      costPrice: toNullableNumber(product.cost_price),
      minSalePrice: toNullableNumber(product.min_sale_price),
      maxSalePrice: toNullableNumber(product.max_sale_price),
      unit: product.unit ?? null,
      imageUrl: product.image_url ?? null,
      status: product.status as ProductEntity['status'],
      createdAt: product.created_at.toISOString(),
      updatedAt: product.updated_at.toISOString(),
    }));
  }
}
