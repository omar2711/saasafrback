import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { AuditService } from '../../../../../common/audit/audit.service';
import { toNullableNumber, toNumber } from '../../../../../common/utils/numbers';
import { ProductEntity } from '../../domain/entities/product.entity';
import { UpdateProductDto } from '../../presentation/dto/update-product.dto';

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
export class UpdateProductUseCase {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async execute(
    context: RlsContext,
    productId: string,
    dto: UpdateProductDto,
  ): Promise<ProductEntity> {
    const orgId = context.orgId;

    const products = await this.db.withRls(context, async (client) => {
      // Valor anterior para la auditoria de precios, en la misma transaccion.
      const [before] = await client.query<ProductRow>(
        `SELECT id, org_id, sku, name, category, category_id, description, sale_price, cost_price,
                min_sale_price, max_sale_price, unit, image_url, status, created_at, updated_at
         FROM products WHERE id = $1`,
        [productId],
      );

      const rows = await client.query<ProductRow>(
        `UPDATE products
         SET sku = COALESCE($1::text, sku),
             name = COALESCE($2::text, name),
             category_id = COALESCE($11::uuid, category_id),
             category = COALESCE(
               (SELECT name FROM product_categories WHERE id = $11::uuid AND org_id = $12),
               $3::text,
               category
             ),
             description = COALESCE($4::text, description),
             sale_price = COALESCE($5::numeric, sale_price),
             cost_price = COALESCE($6::numeric, cost_price),
             -- COALESCE no sirve aqui: null significa "sin limite", un valor
             -- legitimo, y hay que poder borrar un rango ya puesto. El booleano
             -- distingue "campo ausente" de "campo enviado como null".
             min_sale_price = CASE WHEN $13::boolean THEN $14::numeric ELSE min_sale_price END,
             max_sale_price = CASE WHEN $15::boolean THEN $16::numeric ELSE max_sale_price END,
             unit = COALESCE($7::text, unit),
             image_url = COALESCE($8::text, image_url),
             status = COALESCE(
               $9::text,
               CASE
                 WHEN status = 'pending_pricing' AND $5::numeric > 0 THEN 'active'
                 ELSE status
               END
             )
         WHERE id = $10
         RETURNING id, org_id, sku, name, category, category_id, description, sale_price, cost_price, min_sale_price, max_sale_price, unit, image_url, status, created_at, updated_at`,
        [
          dto.sku ?? null,
          dto.name ?? null,
          dto.category ?? null,
          dto.description ?? null,
          dto.salePrice ?? null,
          dto.costPrice ?? null,
          dto.unit ?? null,
          dto.image ?? null,
          dto.status ?? null,
          productId,
          dto.categoryId ?? null,
          orgId,
          dto.minSalePrice !== undefined,
          dto.minSalePrice ?? null,
          dto.maxSalePrice !== undefined,
          dto.maxSalePrice ?? null,
        ],
      );

      const changedPrice =
        rows[0] &&
        before &&
        (toNumber(before.sale_price) !== toNumber(rows[0].sale_price) ||
          before.min_sale_price !== rows[0].min_sale_price ||
          before.max_sale_price !== rows[0].max_sale_price);

      if (changedPrice) {
        await this.audit.recordInTransaction(client, context, {
          action: 'price.change',
          entityType: 'product',
          entityId: productId,
          metadata: {
            scope: 'global',
            sku: rows[0].sku,
            previousSalePrice: toNumber(before.sale_price),
            newSalePrice: toNumber(rows[0].sale_price),
            previousMinSalePrice: toNullableNumber(before.min_sale_price),
            newMinSalePrice: toNullableNumber(rows[0].min_sale_price),
            previousMaxSalePrice: toNullableNumber(before.max_sale_price),
            newMaxSalePrice: toNullableNumber(rows[0].max_sale_price),
          },
        });
      }

      if (rows[0] && dto.minStock !== undefined && dto.branchId) {
        await client.execute(
          `INSERT INTO inventory_stock (org_id, branch_id, product_id, quantity_on_hand, min_stock)
           VALUES ($1, $2, $3, 0, $4)
           ON CONFLICT (branch_id, product_id) DO UPDATE SET min_stock = EXCLUDED.min_stock`,
          [orgId, dto.branchId, productId, dto.minStock],
        );
      }

      return rows;
    });

    if (!products[0]) {
      throw new NotFoundException('Product not found');
    }

    const product = products[0];
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
      minSalePrice: toNullableNumber(product.min_sale_price),
      maxSalePrice: toNullableNumber(product.max_sale_price),
      unit: product.unit ?? null,
      imageUrl: product.image_url ?? null,
      status: product.status as ProductEntity['status'],
      createdAt: product.created_at.toISOString(),
      updatedAt: product.updated_at.toISOString(),
    };
  }
}
