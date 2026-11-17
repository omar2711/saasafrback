import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';

@Injectable()
export class DeleteRoleUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, roleId: string): Promise<void> {
    await this.db.withRls(context, async (client) => {
      const [role] = await client.query<{ id: string; is_system: boolean }>(
        `SELECT id, is_system FROM roles WHERE id = $1 AND deleted_at IS NULL`,
        [roleId],
      );

      if (!role) {
        throw new NotFoundException('Rol no encontrado');
      }
      if (role.is_system) {
        throw new BadRequestException('No se puede eliminar un rol del sistema');
      }

      const [assigned] = await client.query<{ total: string }>(
        `SELECT count(*)::text AS total FROM user_roles WHERE role_id = $1`,
        [roleId],
      );
      if (Number(assigned?.total ?? 0) > 0) {
        throw new BadRequestException(
          `No se puede eliminar: el rol está asignado a ${assigned.total} usuario(s). Quítaselo primero.`,
        );
      }

      try {
        await client.execute(`UPDATE roles SET deleted_at = now(), updated_at = now() WHERE id = $1`, [roleId]);
      } catch (e) {
        if ((e as { code?: string }).code === '23503') {
          throw new BadRequestException('No se puede eliminar: el rol está en uso en otra parte del sistema');
        }
        throw e;
      }
      // Borrado logico: el rol queda con deleted_at y deja de aparecer en la lista.
    });
  }
}
