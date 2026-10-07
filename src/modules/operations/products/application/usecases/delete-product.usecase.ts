import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';

@Injectable()
export class DeleteProductUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, productId: string): Promise<void> {
    const rows = await this.db.withRls(context, (client) =>
      client.query<{ id: string }>(
        `UPDATE products
         SET deleted_at = now()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [productId],
      ),
    );

    if (!rows[0]) {
      throw new NotFoundException('Producto no encontrado');
    }
  }
}
