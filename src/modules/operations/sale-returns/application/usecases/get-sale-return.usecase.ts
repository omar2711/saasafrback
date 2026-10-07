import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { SaleReturnEntity } from '../../domain/entities/sale-return.entity';
import { loadSaleReturn } from '../sale-return-helpers';

@Injectable()
export class GetSaleReturnUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, returnId: string): Promise<SaleReturnEntity> {
    const result = await this.db.withRls(context, (client) => loadSaleReturn(client, returnId));
    if (!result) {
      throw new NotFoundException('Devolucion no encontrada');
    }
    return result;
  }
}
