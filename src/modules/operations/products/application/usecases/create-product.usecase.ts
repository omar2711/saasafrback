import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNullableNumber, toNumber } from '../../../../../common/utils/numbers';
import { ProductEntity } from '../../domain/entities/product.entity';
import { CreateProductDto } from '../../presentation/dto/create-product.dto';

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
export class CreateProductUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, dto: CreateProductDto): Promise<ProductEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const result = await this.db
      .withRls(context, async (client) => {
      const [product] = await client.query<ProductRow>(
        `INSERT INTO products (org_id, sku, name, category, category_id, description, sale_price, cost_price, min_sale_price, max_sale_price, unit, image_url, status)
         VALUES (
           $1, $2, $3,
           COALESCE((SELECT name FROM product_categories WHERE id = $4::uuid AND org_id = $1), $5),
           $4::uuid, $6, $7, $8, $11, $12, $9, $10, 'active')
         RETURNING id, org_id, sku, name, category, category_id, description, sale_price, cost_price, min_sale_price, max_sale_price, unit, image_url, status, created_at, updated_at`,
        [
          orgId,
          dto.sku,
          dto.name,
          dto.categoryId ?? null,
          dto.category ?? null,
          dto.description ?? null,
          dto.salePrice,
          dto.costPrice ?? null,
          dto.unit ?? 'unidad',
          dto.image ?? null,
          dto.minSalePrice ?? null,
          dto.maxSalePrice ?? null,
        ],
      );

      if (dto.branchId) {
        await client.execute(
          `INSERT INTO inventory_stock (org_id, branch_id, product_id, quantity_on_hand, min_stock)
           VALUES ($1, $2, $3, 0, $4)
           ON CONFLICT (branch_id, product_id) DO UPDATE SET min_stock = EXCLUDED.min_stock`,
          [orgId, dto.branchId, product.id, dto.minStock ?? 0],
        );
      }

        return product;
      })
      // El unico (org_id, sku) llegaba al usuario como "Internal server error".
      // Se traduce aqui y no con un SELECT previo porque el indice es la unica
      // garantia real frente a dos altas concurrentes.
      .catch((error: unknown) => {
        const pgError = error as { code?: string; constraint?: string };
        if (pgError?.code === '23505' && pgError?.constraint === 'products_org_id_sku_key') {
          throw new ConflictException('Ya existe un producto con ese identificador (SKU)');
        }
        throw error;
      });

    return {
      id: result.id,
      orgId: result.org_id,
      sku: result.sku,
      name: result.name,
      category: result.category ?? null,
      categoryId: result.category_id ?? null,
      description: result.description ?? null,
      salePrice: toNumber(result.sale_price),
      costPrice: toNullableNumber(result.cost_price),
      minSalePrice: toNullableNumber(result.min_sale_price),
      maxSalePrice: toNullableNumber(result.max_sale_price),
      unit: result.unit ?? null,
      imageUrl: result.image_url ?? null,
      status: result.status as ProductEntity['status'],
      createdAt: result.created_at.toISOString(),
      updatedAt: result.updated_at.toISOString(),
    };
  }
}
