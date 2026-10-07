import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { AuditService } from '../../../../../common/audit/audit.service';
import { toNullableNumber, toNumber } from '../../../../../common/utils/numbers';
import {
  InventoryMovementEntity,
  InventoryMovementType,
  MOVEMENT_TYPES_REQUIRING_NOTES,
  NEGATIVE_MOVEMENT_TYPES,
} from '../../domain/entities/inventory-movement.entity';
import { CreateInventoryMovementDto } from '../../presentation/dto/create-inventory-movement.dto';

interface StockRow {
  id: string;
  quantity_on_hand: string;
  min_stock: string;
}

interface MovementRow {
  id: string;
  org_id: string;
  branch_id: string;
  product_id: string;
  movement_type: string;
  quantity: string;
  unit_cost: string | null;
  total_cost: string | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: Date;
}

export interface InventoryMovementResult {
  movement: InventoryMovementEntity;
  currentStock: number;
}

@Injectable()
export class CreateInventoryMovementUseCase {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async execute(
    context: RlsContext,
    userId: string,
    dto: CreateInventoryMovementDto,
  ): Promise<InventoryMovementResult> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const notes = dto.notes?.trim() || null;
    if (MOVEMENT_TYPES_REQUIRING_NOTES.includes(dto.movementType) && !notes) {
      throw new BadRequestException('Debes indicar el motivo del movimiento');
    }

    const result = await this.db.withRls(context, async (client) => {
      let [stock] = await client.query<StockRow>(
        `SELECT id, quantity_on_hand, min_stock
         FROM inventory_stock
         WHERE org_id = $1 AND branch_id = $2 AND product_id = $3
         FOR UPDATE`,
        [orgId, dto.branchId, dto.productId],
      );

      if (!stock) {
        const created = await client.query<StockRow>(
          `INSERT INTO inventory_stock (org_id, branch_id, product_id, quantity_on_hand, min_stock)
           VALUES ($1, $2, $3, 0, 0)
           RETURNING id, quantity_on_hand, min_stock`,
          [orgId, dto.branchId, dto.productId],
        );
        stock = created[0];
      }

      const current = toNumber(stock.quantity_on_hand);
      const delta = resolveDelta(dto.movementType, dto.quantity);
      const next = current + delta;

      if (next < 0) {
        throw new BadRequestException(
          `Stock insuficiente: hay ${current} unidades y se intentan descontar ${dto.quantity}`,
        );
      }

      await client.execute(
        `UPDATE inventory_stock
         SET quantity_on_hand = $1
         WHERE id = $2`,
        [next, stock.id],
      );

      const totalCost = dto.unitCost !== undefined ? dto.unitCost * dto.quantity : null;

      const [movement] = await client.query<MovementRow>(
        `INSERT INTO inventory_movements (
           org_id,
           branch_id,
           product_id,
           movement_type,
           quantity,
           unit_cost,
           total_cost,
           reference_type,
           reference_id,
           notes,
           created_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, org_id, branch_id, product_id, movement_type, quantity, unit_cost, total_cost,
                   reference_type, reference_id, notes, created_by, created_at`,
        [
          orgId,
          dto.branchId,
          dto.productId,
          dto.movementType,
          dto.quantity,
          dto.unitCost ?? null,
          totalCost,
          dto.referenceType ?? null,
          dto.referenceId ?? null,
          notes,
          userId,
        ],
      );

      // Solo las bajas y los ajustes manuales: auditar cada 'sale' o 'purchase'
      // duplicaria el libro mayor que ya es inventory_movements.
      if (['damage', 'adjustment', 'adjustment_out'].includes(dto.movementType)) {
        await this.audit.recordInTransaction(client, context, {
          action: dto.movementType === 'damage' ? 'inventory.write_off' : 'inventory.adjust',
          entityType: 'product',
          entityId: dto.productId,
          metadata: {
            movementId: movement.id,
            branchId: dto.branchId,
            movementType: dto.movementType,
            quantity: dto.quantity,
            stockBefore: current,
            stockAfter: next,
            notes,
          },
        });
      }

      return {
        movement: {
          id: movement.id,
          orgId: movement.org_id,
          branchId: movement.branch_id,
          productId: movement.product_id,
          movementType: movement.movement_type as InventoryMovementEntity['movementType'],
          quantity: toNumber(movement.quantity),
          unitCost: toNullableNumber(movement.unit_cost),
          totalCost: toNullableNumber(movement.total_cost),
          referenceType: movement.reference_type ?? null,
          referenceId: movement.reference_id ?? null,
          notes: movement.notes ?? null,
          createdBy: movement.created_by ?? null,
          createdAt: movement.created_at.toISOString(),
        },
        currentStock: next,
      };
    });

    return result;
  }
}

/**
 * El signo del movimiento lo define el tipo, no la cantidad (que siempre llega
 * positiva por el @Min(0.01) del DTO). Antes el `default` sumaba, lo que hacia
 * que una salida manual aumentara el stock en vez de reducirlo.
 */
const resolveDelta = (movementType: InventoryMovementType, quantity: number): number =>
  NEGATIVE_MOVEMENT_TYPES.includes(movementType) ? -quantity : quantity;
