import { Injectable } from '@nestjs/common';
import { DbClient, DbService, RlsContext } from '../../database/db.service';

/**
 * Acciones auditadas. Es una lista cerrada a proposito: la pantalla de
 * Auditoria traduce cada codigo a una etiqueta y un icono, y un codigo libre
 * apareceria en crudo.
 */
export const AUDIT_ACTIONS = [
  'login',
  'logout',
  'sale.void',
  'sale.return',
  'sale.return_void',
  'inventory.write_off',
  'inventory.adjust',
  'price.change',
  'user.create',
  'user.status_change',
  'role.change',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditEntry {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  /**
   * Contexto legible del cambio. Para un cambio de precio incluye el valor
   * anterior y el nuevo: es lo que un interceptor generico no podria saber.
   */
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: DbService) {}

  /**
   * Escribe el asiento con el cliente de la transaccion en curso.
   *
   * Se llama DENTRO del usecase, no desde un interceptor: si la operacion hace
   * ROLLBACK, el asiento se va con ella. Registrar la anulacion de una venta
   * que al final no se anulo es peor que no registrar nada.
   */
  async recordInTransaction(
    client: DbClient,
    context: RlsContext,
    entry: AuditEntry,
  ): Promise<void> {
    await client.execute(
      `INSERT INTO audit_logs (org_id, user_id, action, entity_type, entity_id, metadata, ip, user_agent)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6::jsonb, $7, $8)`,
      [
        context.orgId ?? null,
        context.userId ?? null,
        entry.action,
        entry.entityType,
        entry.entityId ?? null,
        entry.metadata ? JSON.stringify(entry.metadata) : null,
        entry.ip ?? null,
        entry.userAgent ?? null,
      ],
    );
  }

  /**
   * Para lo que no ocurre dentro de una transaccion de negocio (login, logout).
   * Nunca hace fallar la operacion que lo invoca: que la auditoria no pueda
   * escribir no es motivo para impedir que alguien inicie sesion.
   */
  async record(context: RlsContext, entry: AuditEntry): Promise<void> {
    try {
      await this.db.withRls(context, (client) =>
        this.recordInTransaction(client, context, entry),
      );
    } catch (error) {
      console.error('[AuditService] No se pudo registrar el evento:', entry.action, error);
    }
  }
}
