import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { SaleReturnEntity } from '../../domain/entities/sale-return.entity';
import { ListSaleReturnsDto } from '../../presentation/dto/list-sale-returns.dto';
import { mapSaleReturn } from '../sale-return-helpers';

interface ReturnRow {
  id: string;
  org_id: string;
  sale_id: string;
  sale_number: string | null;
  branch_id: string | null;
  return_number: string;
  status: string;
  reason: string | null;
  refund_total: string;
  created_at: Date;
  updated_at: Date;
  voided_at: Date | null;
}

interface ReturnItemRow {
  id: string;
  return_id: string;
  sale_item_id: string;
  product_id: string | null;
  product_name: string | null;
  kit_id: string | null;
  kit_name: string | null;
  quantity: string;
  unit_price: string;
  refund_amount: string;
  condition: string;
  notes: string | null;
}

@Injectable()
export class ListSaleReturnsUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, query: ListSaleReturnsDto): Promise<SaleReturnEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    return this.db.withRls(context, async (client) => {
      const returns = await client.query<ReturnRow>(
        `SELECT sr.id, sr.org_id, sr.sale_id, s.sale_number, s.branch_id,
                sr.return_number, sr.status, sr.reason, sr.refund_total,
                sr.created_at, sr.updated_at, sr.voided_at
         FROM sale_returns sr
         JOIN sales s ON s.id = sr.sale_id
         WHERE sr.org_id = $1
           AND ($2::uuid IS NULL OR sr.sale_id = $2::uuid)
           AND ($3::uuid IS NULL OR s.branch_id = $3::uuid)
           AND ($4::text IS NULL OR sr.status = $4::text)
         ORDER BY sr.created_at DESC`,
        [orgId, query.saleId ?? null, query.branchId ?? null, query.status ?? null],
      );

      if (returns.length === 0) return [];

      const ids = returns.map((r) => r.id);
      const items = await client.query<ReturnItemRow>(
        `SELECT sri.id, sri.return_id, sri.sale_item_id, si.product_id, p.name AS product_name,
                si.kit_id, k.name AS kit_name, sri.quantity, sri.unit_price, sri.refund_amount,
                sri.condition, sri.notes
         FROM sale_return_items sri
         JOIN sale_items si ON si.id = sri.sale_item_id
         LEFT JOIN products p ON p.id = si.product_id
         LEFT JOIN kits k ON k.id = si.kit_id
         WHERE sri.return_id = ANY($1::uuid[])
         ORDER BY sri.created_at ASC`,
        [ids],
      );

      const itemsByReturn = new Map<string, ReturnItemRow[]>();
      for (const item of items) {
        const list = itemsByReturn.get(item.return_id) ?? [];
        list.push(item);
        itemsByReturn.set(item.return_id, list);
      }

      return returns.map((r) => mapSaleReturn(r, itemsByReturn.get(r.id) ?? []));
    });
  }
}
