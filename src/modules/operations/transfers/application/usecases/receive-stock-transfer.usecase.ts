import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { StockTransferEntity } from '../../domain/entities/stock-transfer.entity';
import { applyStockDelta, loadTransfer, recordTransferMovement } from '../transfer-helpers';

@Injectable()
export class ReceiveStockTransferUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, transferId: string): Promise<StockTransferEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const result = await this.db.withRls(context, async (client) => {
      const [header] = await client.query<{
        id: string;
        status: string;
        dest_branch_id: string;
      }>(
        `SELECT id, status, dest_branch_id FROM stock_transfers WHERE id = $1 FOR UPDATE`,
        [transferId],
      );

      if (!header) return { notFound: true as const };
      if (header.status !== 'in_transit') {
        throw new BadRequestException('Solo se pueden recibir traspasos en transito');
      }

      const items = await client.query<{ product_id: string; quantity: string }>(
        `SELECT product_id, quantity FROM stock_transfer_items WHERE transfer_id = $1`,
        [transferId],
      );

      for (const item of items) {
        const quantity = Number(item.quantity);
        await applyStockDelta(client, orgId, header.dest_branch_id, item.product_id, quantity);
        await recordTransferMovement(
          client,
          orgId,
          header.dest_branch_id,
          item.product_id,
          'transfer_in',
          quantity,
          transferId,
        );
      }

      await client.execute(
        `UPDATE stock_transfers SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = $1`,
        [transferId],
      );

      const transfer = await loadTransfer(client, transferId);
      return { transfer };
    });

    if ('notFound' in result) {
      throw new NotFoundException('Traspaso no encontrado');
    }
    return result.transfer as StockTransferEntity;
  }
}
