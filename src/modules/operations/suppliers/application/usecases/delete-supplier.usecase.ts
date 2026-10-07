import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';

@Injectable()
export class DeleteSupplierUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, supplierId: string): Promise<void> {
    const rows = await this.db.withRls(context, (client) =>
      client.query<{ id: string }>(
        `UPDATE suppliers
         SET deleted_at = now()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [supplierId],
      ),
    );

    if (!rows[0]) {
      throw new NotFoundException('Proveedor no encontrado');
    }
  }
}
