import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { StockTransferEntity } from '../../domain/entities/stock-transfer.entity';
import { loadTransfer } from '../transfer-helpers';

@Injectable()
export class GetStockTransferUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, transferId: string): Promise<StockTransferEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const transfer = await this.db.withRls(context, (client) => loadTransfer(client, transferId));

    if (!transfer) {
      throw new NotFoundException('Traspaso no encontrado');
    }
    return transfer;
  }
}
