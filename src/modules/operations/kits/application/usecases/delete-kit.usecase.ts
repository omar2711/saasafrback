import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';

@Injectable()
export class DeleteKitUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, kitId: string): Promise<void> {
    const rows = await this.db.withRls(context, (client) =>
      client.query<{ id: string }>(
        `UPDATE kits
         SET deleted_at = now(), status = 'inactive'
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [kitId],
      ),
    );

    if (!rows[0]) {
      throw new NotFoundException('Kit no encontrado');
    }
  }
}
