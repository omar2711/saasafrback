import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { AuditService } from '../../../../../common/audit/audit.service';
import { toNumber } from '../../../../../common/utils/numbers';
import {
  resolveLineStockImpacts,
  restockAndRecordMovement,
  SaleStockLine,
} from '../../../sales/application/sale-stock-helpers';
import { SaleReturnEntity } from '../../domain/entities/sale-return.entity';
import {
  CreateSaleReturnDto,
  type ReturnCondition,
} from '../../presentation/dto/create-sale-return.dto';
import {
  getAlreadyReturnedQuantity,
  loadSaleReturn,
  recordDamageMovements,
} from '../sale-return-helpers';

interface SaleRow {
  id: string;
  org_id: string;
  branch_id: string;
  status: string;
}

interface SaleItemRow {
  id: string;
  product_id: string | null;
  kit_id: string | null;
  quantity: string;
  unit_price: string;
  total: string;
}

@Injectable()
export class CreateSaleReturnUseCase {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async execute(context: RlsContext, dto: CreateSaleReturnDto): Promise<SaleReturnEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const returnId = await this.db.withRls(context, async (client) => {
      const [sale] = await client.query<SaleRow>(
        `SELECT id, org_id, branch_id, status FROM sales WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
        [dto.saleId, orgId],
      );
      if (!sale) {
        throw new NotFoundException('Venta no encontrada');
      }
      if (sale.status === 'voided') {
        throw new BadRequestException('No se puede devolver una venta anulada');
      }
      if (sale.status === 'pending_delivery') {
        throw new BadRequestException('No se puede devolver una venta que aun no fue entregada');
      }

      // Se separan por condicion: 'restock' solo repone; 'damaged' repone y da
      // de baja en el mismo acto, dejando los dos asientos en el libro mayor.
      const restockLines: SaleStockLine[] = [];
      const damagedLines: SaleStockLine[] = [];
      const lineInputs: {
        saleItemId: string;
        quantity: number;
        unitPrice: number;
        refundAmount: number;
        condition: ReturnCondition;
        notes: string | null;
      }[] = [];

      for (const item of dto.items) {
        const [saleItem] = await client.query<SaleItemRow>(
          `SELECT id, product_id, kit_id, quantity, unit_price, total
           FROM sale_items
           WHERE id = $1 AND sale_id = $2`,
          [item.saleItemId, dto.saleId],
        );
        if (!saleItem) {
          throw new BadRequestException('Una de las lineas indicadas no pertenece a esta venta');
        }

        const soldQty = toNumber(saleItem.quantity);
        const alreadyReturned = await getAlreadyReturnedQuantity(client, saleItem.id);
        const remaining = soldQty - alreadyReturned;
        if (item.quantity > remaining) {
          throw new BadRequestException(
            `No se puede devolver mas de lo disponible (quedan ${remaining} unidad(es) por devolver)`,
          );
        }

        const netUnitPrice = soldQty > 0 ? toNumber(saleItem.total) / soldQty : 0;
        const refundAmount = netUnitPrice * item.quantity;

        const condition: ReturnCondition = item.condition ?? 'restock';

        lineInputs.push({
          saleItemId: saleItem.id,
          quantity: item.quantity,
          unitPrice: toNumber(saleItem.unit_price),
          refundAmount,
          condition,
          notes: item.notes ?? null,
        });

        const impacts = await resolveLineStockImpacts(client, [
          { productId: saleItem.product_id, kitId: saleItem.kit_id, quantity: item.quantity },
        ]);
        restockLines.push(...impacts);
        if (condition === 'damaged') {
          damagedLines.push(...impacts);
        }
      }

      const refundTotal = lineInputs.reduce((sum, l) => sum + l.refundAmount, 0);

      // COUNT(*) daba el mismo numero a dos devoluciones concurrentes y la
      // segunda moria contra UNIQUE (org_id, return_number). El contador de la
      // 029 toma un lock de fila y serializa a los dos escritores.
      const [{ next_number: nextNumber }] = await client.query<{ next_number: string }>(
        `SELECT app.next_document_number($1::uuid, 'sale_return') AS next_number`,
        [orgId],
      );
      const returnNumber = `RET-${String(Number(nextNumber)).padStart(5, '0')}`;

      const [header] = await client.query<{ id: string }>(
        `INSERT INTO sale_returns (org_id, sale_id, return_number, reason, refund_total)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [orgId, dto.saleId, returnNumber, dto.reason ?? null, refundTotal],
      );

      for (const line of lineInputs) {
        await client.execute(
          `INSERT INTO sale_return_items (org_id, return_id, sale_item_id, quantity, unit_price, refund_amount, condition, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            orgId,
            header.id,
            line.saleItemId,
            line.quantity,
            line.unitPrice,
            line.refundAmount,
            line.condition,
            line.notes,
          ],
        );
      }

      // Primero entra todo (+return): el producto devuelto existio de verdad y
      // quantity_on_hand tiene que poder reconstruirse sumando los movimientos.
      await restockAndRecordMovement(
        client,
        orgId,
        sale.branch_id,
        restockLines,
        'sale_return',
        header.id,
      );

      // Y lo que vino roto sale de inmediato (-damage). Neto cero en stock, y la
      // pestana Bajas lo recoge sin ningun cambio: ya filtra por 'damage'.
      await recordDamageMovements(
        client,
        orgId,
        sale.branch_id,
        damagedLines,
        header.id,
        dto.reason ?? 'Devolucion de producto danado',
      );

      await this.audit.recordInTransaction(client, context, {
        action: 'sale.return',
        entityType: 'sale_return',
        entityId: header.id,
        metadata: {
          returnNumber,
          saleId: dto.saleId,
          refundTotal,
          reason: dto.reason ?? null,
          damagedLines: lineInputs.filter((line) => line.condition === 'damaged').length,
          lines: lineInputs.length,
        },
      });

      return header.id;
    });

    const result = await this.db.withRls(context, (client) => loadSaleReturn(client, returnId));
    if (!result) {
      throw new NotFoundException('Devolucion no encontrada');
    }
    return result;
  }
}
