import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
export class GetKitUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, kitId: string): Promise<KitEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const result = await this.db.withRls(context, async (client) => {
      const [kit] = await client.query<KitRow>(
        `SELECT id, org_id, sku, name, description, sale_price, status, created_at, updated_at
         FROM kits
         WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
        [kitId, orgId],
      );
      if (!kit) return null;

      const items = await client.query<KitItemRow>(
        `SELECT ki.id, ki.kit_id, ki.product_id, p.name AS product_name, p.cost_price AS product_cost_price, ki.quantity
         FROM kit_items ki
         LEFT JOIN products p ON p.id = ki.product_id
         WHERE ki.kit_id = $1
         ORDER BY ki.created_at ASC`,
        [kitId],
      );

      return { kit, items };
    });

    if (!result) {
      throw new NotFoundException('Kit no encontrado');
    }

    const kitItems: KitItemEntity[] = result.items.map((item) => ({
      id: item.id,
      kitId: item.kit_id,
      productId: item.product_id,
      productName: item.product_name ?? null,
      productCostPrice: toNullableNumber(item.product_cost_price),
      quantity: toNumber(item.quantity),
    }));

    const componentsTotal = kitItems.reduce(
      (sum, item) => sum + (item.productCostPrice ?? 0) * item.quantity,
      0,
    );

    const kit = result.kit;
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
  }
}
