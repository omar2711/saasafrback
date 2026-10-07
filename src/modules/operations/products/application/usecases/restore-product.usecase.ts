import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNullableNumber, toNumber } from '../../../../../common/utils/numbers';
import { ProductEntity } from '../../domain/entities/product.entity';

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
  unit: string | null;
  image_url: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class RestoreProductUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, productId: string): Promise<ProductEntity> {
    const rows = await this.db.withRls(context, (client) =>
      client.query<ProductRow>(
        `UPDATE products
         SET deleted_at = NULL, updated_at = now()
         WHERE id = $1 AND deleted_at IS NOT NULL
         RETURNING id, org_id, sku, name, category, category_id, description, sale_price, cost_price, unit, image_url, status, created_at, updated_at`,
        [productId],
      ),
    );

    if (!rows[0]) {
      throw new NotFoundException('Producto no encontrado en la papelera');
    }

    const product = rows[0];
    return {
      id: product.id,
      orgId: product.org_id,
      sku: product.sku,
      name: product.name,
      category: product.category ?? null,
      categoryId: product.category_id ?? null,
      description: product.description ?? null,
      salePrice: toNumber(product.sale_price),
      costPrice: toNullableNumber(product.cost_price),
      unit: product.unit ?? null,
      imageUrl: product.image_url ?? null,
      status: product.status as ProductEntity['status'],
      createdAt: product.created_at.toISOString(),
      updatedAt: product.updated_at.toISOString(),
    };
  }
}
