import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { KitEntity, KitItemEntity } from '../../domain/entities/kit.entity';
import { UpdateKitDto } from '../../presentation/dto/update-kit.dto';

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
export class UpdateKitUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, kitId: string, dto: UpdateKitDto): Promise<KitEntity> {
    const orgId = context.orgId;

    try {
      const result = await this.db.withRls(context, async (client) => {
        const rows = await client.query<KitRow>(
          `UPDATE kits
           SET sku = COALESCE($1::text, sku),
               name = COALESCE($2::text, name),
               description = COALESCE($3::text, description),
               sale_price = COALESCE($4::numeric, sale_price),
               status = COALESCE($5::text, status),
               updated_at = now()
           WHERE id = $6 AND deleted_at IS NULL
           RETURNING id, org_id, sku, name, description, sale_price, status, created_at, updated_at`,
          [
            dto.sku ?? null,
            dto.name ?? null,
            dto.description ?? null,
            dto.salePrice ?? null,
            dto.status ?? null,
            kitId,
          ],
        );

        if (!rows[0]) return null;

        const items: KitItemEntity[] = [];
        if (dto.items) {
          const productIds = Array.from(new Set(dto.items.map((i) => i.productId)));
          const products = await client.query<ProductRow>(
            `SELECT id, name, cost_price FROM products WHERE id = ANY($1::uuid[]) AND org_id = $2 AND deleted_at IS NULL`,
            [productIds, orgId],
          );
          if (products.length !== productIds.length) {
            throw new BadRequestException('Uno o mas productos del kit no existen o no pertenecen a la organizacion');
          }
          const productMap = new Map(products.map((p) => [p.id, p]));

          await client.execute(`DELETE FROM kit_items WHERE kit_id = $1`, [kitId]);
          for (const item of dto.items) {
            const [createdItem] = await client.query<{ id: string }>(
              `INSERT INTO kit_items (org_id, kit_id, product_id, quantity) VALUES ($1, $2, $3, $4) RETURNING id`,
              [orgId, kitId, item.productId, item.quantity],
            );
            const product = productMap.get(item.productId)!;
            items.push({
              id: createdItem.id,
              kitId,
              productId: item.productId,
              productName: product.name,
              productCostPrice: toNumber(product.cost_price),
              quantity: item.quantity,
            });
          }
        }

        return { kit: rows[0], items };
      });

      if (!result) {
        throw new NotFoundException('Kit no encontrado');
      }

      const kit = result.kit;
      return {
        id: kit.id,
        orgId: kit.org_id,
        sku: kit.sku,
        name: kit.name,
        description: kit.description ?? null,
        salePrice: toNumber(kit.sale_price),
        status: kit.status as KitEntity['status'],
        items: result.items,
        createdAt: kit.created_at.toISOString(),
        updatedAt: kit.updated_at.toISOString(),
      };
    } catch (err: unknown) {
      if (err && typeof err === 'object' && (err as { code?: string }).code === '23505') {
        throw new ConflictException('Ya existe un kit con ese SKU');
      }
      throw err;
    }
  }
}
