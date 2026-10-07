import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { StockTransferEntity } from '../../domain/entities/stock-transfer.entity';
import { CreateStockTransferDto } from '../../presentation/dto/create-stock-transfer.dto';
import { applyStockDelta, loadTransfer, recordTransferMovement } from '../transfer-helpers';

@Injectable()
export class CreateStockTransferUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, dto: CreateStockTransferDto): Promise<StockTransferEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    if (dto.sourceBranchId === dto.destBranchId) {
      throw new BadRequestException('La sucursal de origen y destino deben ser diferentes');
    }

    // Validar que no haya productos repetidos
    const productIds = dto.items.map((i) => i.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('No se permite repetir productos en un traspaso');
    }

    const transfer = await this.db.withRls(context, async (client) => {
      const [{ count }] = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM stock_transfers WHERE org_id = $1`,
        [orgId],
      );
      const transferNumber = `TRF-${String(Number(count) + 1).padStart(5, '0')}`;

      const [header] = await client.query<{ id: string }>(
        `INSERT INTO stock_transfers (org_id, source_branch_id, dest_branch_id, transfer_number, status, notes)
         VALUES ($1, $2, $3, $4, 'in_transit', $5)
         RETURNING id`,
        [orgId, dto.sourceBranchId, dto.destBranchId, transferNumber, dto.notes ?? null],
      );

      for (const item of dto.items) {
        // Descontar del origen (queda en transito)
        await applyStockDelta(client, orgId, dto.sourceBranchId, item.productId, -item.quantity);

        await client.execute(
          `INSERT INTO stock_transfer_items (org_id, transfer_id, product_id, quantity)
           VALUES ($1, $2, $3, $4)`,
          [orgId, header.id, item.productId, item.quantity],
        );

        await recordTransferMovement(
          client,
          orgId,
          dto.sourceBranchId,
          item.productId,
          'transfer_out',
          item.quantity,
          header.id,
        );
      }

      return loadTransfer(client, header.id);
    });

    if (!transfer) {
      throw new BadRequestException('No se pudo crear el traspaso');
    }

    return transfer;
  }
}
