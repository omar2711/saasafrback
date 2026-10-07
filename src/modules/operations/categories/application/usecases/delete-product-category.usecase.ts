import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';

@Injectable()
export class DeleteProductCategoryUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, id: string): Promise<void> {
    const rows = await this.db.withRls(context, async (client) => {
      const deleted = await client.query<{ id: string }>(
        `UPDATE product_categories
         SET deleted_at = now(), status = 'inactive', updated_at = now()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [id],
      );

      if (deleted[0]) {
        // Desvincular productos: quedan sin categoria asignada
        await client.execute(`UPDATE products SET category_id = NULL WHERE category_id = $1`, [id]);
      }

      return deleted;
    });

    if (!rows[0]) {
      throw new NotFoundException('Categoria no encontrada');
    }
  }
}
