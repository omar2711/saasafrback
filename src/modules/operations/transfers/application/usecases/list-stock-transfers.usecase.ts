import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { StockTransferEntity } from '../../domain/entities/stock-transfer.entity';
import { ListStockTransfersDto } from '../../presentation/dto/list-stock-transfers.dto';
import { mapTransfer } from '../transfer-helpers';

interface TransferRow {
  id: string;
  org_id: string;
  source_branch_id: string;
  dest_branch_id: string;
  source_branch_name: string | null;
  dest_branch_name: string | null;
  transfer_number: string;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  voided_at: Date | null;
}

interface TransferItemRow {
  id: string;
  transfer_id: string;
  product_id: string;
  product_name: string | null;
  quantity: string;
}

@Injectable()
export class ListStockTransfersUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, query: ListStockTransfersDto): Promise<StockTransferEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    return this.db.withRls(context, async (client) => {
      const transfers = await client.query<TransferRow>(
        `SELECT t.id, t.org_id, t.source_branch_id, t.dest_branch_id,
                sb.name AS source_branch_name, db.name AS dest_branch_name,
                t.transfer_number, t.status, t.notes,
                t.created_at, t.updated_at, t.completed_at, t.voided_at
         FROM stock_transfers t
         LEFT JOIN branches sb ON sb.id = t.source_branch_id
         LEFT JOIN branches db ON db.id = t.dest_branch_id
         WHERE t.org_id = $1
           AND ($2::uuid IS NULL OR t.source_branch_id = $2::uuid OR t.dest_branch_id = $2::uuid)
           AND ($3::text IS NULL OR t.status = $3::text)
         ORDER BY t.created_at DESC`,
        [orgId, query.branchId ?? null, query.status ?? null],
      );

      if (transfers.length === 0) return [];

      const ids = transfers.map((t) => t.id);
      const items = await client.query<TransferItemRow>(
        `SELECT i.id, i.transfer_id, i.product_id, p.name AS product_name, i.quantity
         FROM stock_transfer_items i
         LEFT JOIN products p ON p.id = i.product_id
         WHERE i.transfer_id = ANY($1::uuid[])
         ORDER BY i.created_at ASC`,
        [ids],
      );

      const itemsByTransfer = new Map<string, TransferItemRow[]>();
      for (const item of items) {
        const list = itemsByTransfer.get(item.transfer_id) ?? [];
        list.push(item);
        itemsByTransfer.set(item.transfer_id, list);
      }

      return transfers.map((t) => mapTransfer(t, itemsByTransfer.get(t.id) ?? []));
    });
  }
}
