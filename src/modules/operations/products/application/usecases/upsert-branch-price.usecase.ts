import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { AuditService } from '../../../../../common/audit/audit.service';
import { toNullableNumber } from '../../../../../common/utils/numbers';
import { UpsertBranchPriceDto } from '../../presentation/dto/upsert-branch-price.dto';

interface Row {
  id: string;
  product_id: string;
  branch_id: string;
  sale_price: string | null;
  cost_price: string | null;
  min_sale_price: string | null;
  max_sale_price: string | null;
}

@Injectable()
export class UpsertBranchPriceUseCase {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async execute(context: RlsContext, dto: UpsertBranchPriceDto) {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const salePrice = dto.salePrice ?? null;
    const costPrice = dto.costPrice ?? null;
    const minSalePrice = dto.minSalePrice ?? null;
    const maxSalePrice = dto.maxSalePrice ?? null;

    const [row] = await this.db.withRls(context, async (client) => {
      // El valor ANTERIOR se lee dentro de la misma transaccion. Es justo lo que
      // un interceptor generico no puede saber, y sin el la auditoria de precios
      // no sirve para nada.
      const [before] = await client.query<Row>(
        `SELECT id, product_id, branch_id, sale_price, cost_price, min_sale_price, max_sale_price
         FROM product_branch_prices
         WHERE branch_id = $1 AND product_id = $2`,
        [dto.branchId, dto.productId],
      );

      const [saved] = await client.query<Row>(
        `INSERT INTO product_branch_prices (org_id, branch_id, product_id, sale_price, cost_price, min_sale_price, max_sale_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (branch_id, product_id)
         DO UPDATE SET sale_price = EXCLUDED.sale_price,
                       cost_price = EXCLUDED.cost_price,
                       min_sale_price = EXCLUDED.min_sale_price,
                       max_sale_price = EXCLUDED.max_sale_price,
                       updated_at = now()
         RETURNING id, product_id, branch_id, sale_price, cost_price, min_sale_price, max_sale_price`,
        [orgId, dto.branchId, dto.productId, salePrice, costPrice, minSalePrice, maxSalePrice],
      );

      await this.audit.recordInTransaction(client, context, {
        action: 'price.change',
        entityType: 'product',
        entityId: dto.productId,
        metadata: {
          branchId: dto.branchId,
          previousSalePrice: before ? toNullableNumber(before.sale_price) : null,
          newSalePrice: salePrice,
          previousMinSalePrice: before ? toNullableNumber(before.min_sale_price) : null,
          newMinSalePrice: minSalePrice,
          previousMaxSalePrice: before ? toNullableNumber(before.max_sale_price) : null,
          newMaxSalePrice: maxSalePrice,
        },
      });

      return [saved];
    });

    return {
      id: row.id,
      productId: row.product_id,
      branchId: row.branch_id,
      salePrice: toNullableNumber(row.sale_price),
      costPrice: toNullableNumber(row.cost_price),
      minSalePrice: toNullableNumber(row.min_sale_price),
      maxSalePrice: toNullableNumber(row.max_sale_price),
    };
  }
}
