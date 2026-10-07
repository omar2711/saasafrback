import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNullableNumber, toNumber } from '../../../../../common/utils/numbers';
import { KitEntity, KitItemEntity } from '../../domain/entities/kit.entity';

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

interface KitItemRow {
  id: string;
  kit_id: string;
  product_id: string;
  product_name: string | null;
  product_cost_price: string | null;
  quantity: string;
}

@Injectable()
export class ListKitsUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext): Promise<KitEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    return this.db.withRls(context, async (client) => {
      const kits = await client.query<KitRow>(
        `SELECT id, org_id, sku, name, description, sale_price, status, created_at, updated_at
         FROM kits
         WHERE org_id = $1 AND deleted_at IS NULL
         ORDER BY name ASC`,
        [orgId],
      );

      if (kits.length === 0) return [];

      const kitIds = kits.map((k) => k.id);
      const items = await client.query<KitItemRow>(
        `SELECT ki.id, ki.kit_id, ki.product_id, p.name AS product_name, p.cost_price AS product_cost_price, ki.quantity
         FROM kit_items ki
         LEFT JOIN products p ON p.id = ki.product_id
         WHERE ki.kit_id = ANY($1::uuid[])
         ORDER BY ki.created_at ASC`,
        [kitIds],
      );

      const itemsByKit = new Map<string, KitItemEntity[]>();
      for (const item of items) {
        const list = itemsByKit.get(item.kit_id) ?? [];
        list.push({
          id: item.id,
          kitId: item.kit_id,
          productId: item.product_id,
          productName: item.product_name ?? null,
          productCostPrice: toNullableNumber(item.product_cost_price),
          quantity: toNumber(item.quantity),
        });
        itemsByKit.set(item.kit_id, list);
      }

      return kits.map((kit) => {
        const kitItems = itemsByKit.get(kit.id) ?? [];
        const componentsTotal = kitItems.reduce(
          (sum, item) => sum + (item.productCostPrice ?? 0) * item.quantity,
          0,
        );
        return {
          id: kit.id,
          orgId: kit.org_id,
          sku: kit.sku,
          name: kit.name,
          description: kit.description ?? null,
          salePrice: toNumber(kit.sale_price),
          status: kit.status as KitEntity['status'],
          items: kitItems,
          componentsTotal,
          createdAt: kit.created_at.toISOString(),
          updatedAt: kit.updated_at.toISOString(),
        };
      });
    });
  }
}
