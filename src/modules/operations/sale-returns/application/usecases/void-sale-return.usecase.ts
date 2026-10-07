import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { AuditService } from '../../../../../common/audit/audit.service';
import { toNumber } from '../../../../../common/utils/numbers';
import {
  applyStockDecrementAndRecordMovement,
  resolveLineStockImpacts,
  SaleStockLine,
} from '../../../sales/application/sale-stock-helpers';
import { SaleReturnEntity } from '../../domain/entities/sale-return.entity';
import { loadSaleReturn } from '../sale-return-helpers';

interface ReturnItemLineRow {
  product_id: string | null;
  kit_id: string | null;
  quantity: string;
  condition: string;
}

@Injectable()
export class VoidSaleReturnUseCase {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async execute(context: RlsContext, returnId: string): Promise<SaleReturnEntity> {
    await this.db.withRls(context, async (client) => {
      const [saleReturn] = await client.query<{ id: string; status: string; org_id: string; branch_id: string }>(
        `SELECT sr.id, sr.status, sr.org_id, s.branch_id
         FROM sale_returns sr
         JOIN sales s ON s.id = sr.sale_id
         WHERE sr.id = $1
         FOR UPDATE`,
        [returnId],
      );

      if (!saleReturn) {
        throw new NotFoundException('Devolucion no encontrada');
      }
      if (saleReturn.status === 'voided') {
        throw new BadRequestException('La devolucion ya fue anulada');
      }

      const items = await client.query<ReturnItemLineRow>(
        `SELECT si.product_id, si.kit_id, sri.quantity, sri.condition
         FROM sale_return_items sri
         JOIN sale_items si ON si.id = sri.sale_item_id
         WHERE sri.return_id = $1`,
        [returnId],
      );

      const toImpacts = (rows: ReturnItemLineRow[]) =>
        resolveLineStockImpacts(
          client,
          rows.map((item) => ({
            productId: item.product_id,
            kitId: item.kit_id,
            quantity: toNumber(item.quantity),
          })),
        );

      // Deshacer: vuelve a descontar TODO lo que entro con el movimiento
      // 'return', incluidas las lineas danadas, porque tambien entraron.
      const allLines: SaleStockLine[] = await toImpacts(items);
      await applyStockDecrementAndRecordMovement(
        client,
        saleReturn.org_id,
        saleReturn.branch_id,
        returnId,
        allLines,
        'sale_return',
      );

      // Y devolver lo que salio como merma: si no, anular una devolucion de
      // producto danado dejaria el stock 'quantity' unidades por debajo del
      // valor original, porque el -damage se habria quedado sin contrapartida.
      const damagedLines = await toImpacts(items.filter((item) => item.condition === 'damaged'));
      for (const line of damagedLines) {
        await client.execute(
          `UPDATE inventory_stock
           SET quantity_on_hand = quantity_on_hand + $1
           WHERE org_id = $2 AND branch_id = $3 AND product_id = $4`,
          [line.quantity, saleReturn.org_id, saleReturn.branch_id, line.productId],
        );

        await client.execute(
          `INSERT INTO inventory_movements (
             org_id, branch_id, product_id, movement_type,
             quantity, unit_cost, total_cost, reference_type, reference_id, notes
           )
           VALUES ($1, $2, $3, 'adjustment', $4, $5, $6, 'sale_return', $7, $8)`,
          [
            saleReturn.org_id,
            saleReturn.branch_id,
            line.productId,
            line.quantity,
            line.unitCost,
            line.totalCost,
            returnId,
            'Reversa de baja por anulacion de devolucion',
          ],
        );
      }

      await client.execute(
        `UPDATE sale_returns SET status = 'voided', voided_at = now(), updated_at = now() WHERE id = $1`,
        [returnId],
      );

      await this.audit.recordInTransaction(client, context, {
        action: 'sale.return_void',
        entityType: 'sale_return',
        entityId: returnId,
        metadata: {
          lines: items.length,
          damagedLines: items.filter((item) => item.condition === 'damaged').length,
        },
      });
    });

    const result = await this.db.withRls(context, (client) => loadSaleReturn(client, returnId));
    if (!result) {
      throw new NotFoundException('Devolucion no encontrada');
    }
    return result;
  }
}
