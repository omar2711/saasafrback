import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { KitEntity, KitItemEntity } from '../../domain/entities/kit.entity';
import { CreateKitDto } from '../../presentation/dto/create-kit.dto';

interface KitRow {
  id: string;
  org_id: string;
  sku: string;
  name: string;
  description: string | null;
  sale_price: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

interface ProductRow {
  id: string;
  name: string;
  cost_price: string | null;
}

@Injectable()
export class CreateKitUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, dto: CreateKitDto): Promise<KitEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const productIds = Array.from(new Set(dto.items.map((i) => i.productId)));

    try {
      return await this.db.withRls(context, async (client) => {
        const products = await client.query<ProductRow>(
          `SELECT id, name, cost_price FROM products WHERE id = ANY($1::uuid[]) AND org_id = $2 AND deleted_at IS NULL`,
          [productIds, orgId],
        );

        if (products.length !== productIds.length) {
          throw new BadRequestException('Uno o mas productos del kit no existen o no pertenecen a la organizacion');
        }

        const productMap = new Map(products.map((p) => [p.id, p]));

        const [kit] = await client.query<KitRow>(
          `INSERT INTO kits (org_id, sku, name, description, sale_price)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, org_id, sku, name, description, sale_price, status, created_at, updated_at`,
          [orgId, dto.sku, dto.name, dto.description ?? null, dto.salePrice],
        );

        const items: KitItemEntity[] = [];
        let componentsTotal = 0;
        for (const item of dto.items) {
          const [createdItem] = await client.query<{ id: string }>(
            `INSERT INTO kit_items (org_id, kit_id, product_id, quantity) VALUES ($1, $2, $3, $4) RETURNING id`,
            [orgId, kit.id, item.productId, item.quantity],
          );
          const product = productMap.get(item.productId)!;
          const costPrice = toNumber(product.cost_price);
          componentsTotal += costPrice * item.quantity;
          items.push({
            id: createdItem.id,
            kitId: kit.id,
            productId: item.productId,
            productName: product.name,
            productCostPrice: costPrice,
            quantity: item.quantity,
          });
        }

        return {
          id: kit.id,
          orgId: kit.org_id,
          sku: kit.sku,
          name: kit.name,
          description: kit.description ?? null,
          salePrice: toNumber(kit.sale_price),
          status: kit.status as KitEntity['status'],
          items,
          componentsTotal,
          createdAt: kit.created_at.toISOString(),
          updatedAt: kit.updated_at.toISOString(),
        };
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && (err as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe un kit con ese SKU');
      }
      throw err;
    }
  }
}
