import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';

@Injectable()
export class DeleteCustomerUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, customerId: string): Promise<void> {
    const rows = await this.db.withRls(context, (client) =>
      client.query<{ id: string }>(
        `UPDATE customers
         SET deleted_at = now()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [customerId],
      ),
    );

    if (!rows[0]) {
      throw new NotFoundException('Cliente no encontrado');
    }
  }
}
