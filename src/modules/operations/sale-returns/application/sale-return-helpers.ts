import { DbClient } from '../../../../database/db.service';
import { toNumber } from '../../../../common/utils/numbers';
import { SaleReturnEntity, SaleReturnItemEntity } from '../domain/entities/sale-return.entity';

interface ReturnRow {
  id: string;
  org_id: string;
  sale_id: string;
  sale_number: string | null;
  branch_id: string | null;
  return_number: string;
  status: string;
  reason: string | null;
  refund_total: string;
  created_at: Date;
  updated_at: Date;
  voided_at: Date | null;
}

interface ReturnItemRow {
  id: string;
  return_id: string;
  sale_item_id: string;
  product_id: string | null;
  product_name: string | null;
  kit_id: string | null;
  kit_name: string | null;
  quantity: string;
  unit_price: string;
  refund_amount: string;
  condition: string;
  notes: string | null;
}

/** Cantidad ya devuelta (en devoluciones completed) para una linea de venta dada. */
export async function getAlreadyReturnedQuantity(
  client: DbClient,
  saleItemId: string,
): Promise<number> {
  const [row] = await client.query<{ total: string }>(
    `SELECT COALESCE(SUM(sri.quantity), 0) AS total
     FROM sale_return_items sri
     JOIN sale_returns sr ON sr.id = sri.return_id
     WHERE sri.sale_item_id = $1 AND sr.status = 'completed'`,
    [saleItemId],
  );
  return toNumber(row.total);
}

/**
 * Registra la baja de las lineas devueltas en mal estado.
 *
 * El stock ya subio con el movimiento 'return'; esto lo vuelve a bajar con un
 * 'damage'. Son dos asientos y no uno solo porque inventory_movements es un
 * libro mayor: la devolucion ocurrio y la baja tambien, y quantity_on_hand debe
 * poder reconstruirse sumando los movimientos.
 */
export async function recordDamageMovements(
  client: DbClient,
  orgId: string,
  branchId: string,
  lines: { productId: string; quantity: number; unitCost: number; totalCost: number }[],
  returnId: string,
  reason: string,
): Promise<void> {
  for (const line of lines) {
    await client.execute(
      `UPDATE inventory_stock
       SET quantity_on_hand = quantity_on_hand - $1
       WHERE org_id = $2 AND branch_id = $3 AND product_id = $4`,
      [line.quantity, orgId, branchId, line.productId],
    );

    await client.execute(
      `INSERT INTO inventory_movements (
         org_id, branch_id, product_id, movement_type,
         quantity, unit_cost, total_cost, reference_type, reference_id, notes
       )
       VALUES ($1, $2, $3, 'damage', $4, $5, $6, 'sale_return', $7, $8)`,
      [
        orgId,
        branchId,
        line.productId,
        line.quantity,
        line.unitCost,
        line.totalCost,
        returnId,
        reason,
      ],
    );
  }
}

export async function loadSaleReturn(
  client: DbClient,
  returnId: string,
): Promise<SaleReturnEntity | null> {
  const [row] = await client.query<ReturnRow>(
    `SELECT sr.id, sr.org_id, sr.sale_id, s.sale_number, s.branch_id,
            sr.return_number, sr.status, sr.reason, sr.refund_total,
            sr.created_at, sr.updated_at, sr.voided_at
     FROM sale_returns sr
     LEFT JOIN sales s ON s.id = sr.sale_id
     WHERE sr.id = $1`,
    [returnId],
  );
  if (!row) return null;

  const items = await client.query<ReturnItemRow>(
    `SELECT sri.id, sri.return_id, sri.sale_item_id, si.product_id, p.name AS product_name,
            si.kit_id, k.name AS kit_name, sri.quantity, sri.unit_price, sri.refund_amount,
            sri.condition, sri.notes
     FROM sale_return_items sri
     JOIN sale_items si ON si.id = sri.sale_item_id
     LEFT JOIN products p ON p.id = si.product_id
     LEFT JOIN kits k ON k.id = si.kit_id
     WHERE sri.return_id = $1
     ORDER BY sri.created_at ASC`,
    [returnId],
  );

  return mapSaleReturn(row, items);
}

export function mapSaleReturn(row: ReturnRow, items: ReturnItemRow[]): SaleReturnEntity {
  const mappedItems: SaleReturnItemEntity[] = items.map((item) => ({
    id: item.id,
    returnId: item.return_id,
    saleItemId: item.sale_item_id,
    productId: item.product_id ?? null,
    productName: item.product_name ?? null,
    kitId: item.kit_id ?? null,
    kitName: item.kit_name ?? null,
    quantity: toNumber(item.quantity),
    unitPrice: toNumber(item.unit_price),
    refundAmount: toNumber(item.refund_amount),
    condition: item.condition as SaleReturnItemEntity['condition'],
    notes: item.notes ?? null,
  }));

  return {
    id: row.id,
    orgId: row.org_id,
    saleId: row.sale_id,
    saleNumber: row.sale_number ?? null,
    branchId: row.branch_id ?? null,
    returnNumber: row.return_number,
    status: row.status as SaleReturnEntity['status'],
    reason: row.reason ?? null,
    refundTotal: toNumber(row.refund_total),
    items: mappedItems,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    voidedAt: row.voided_at ? row.voided_at.toISOString() : null,
  };
}
