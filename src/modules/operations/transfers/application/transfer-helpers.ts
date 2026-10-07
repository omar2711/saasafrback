import { BadRequestException } from '@nestjs/common';
import { DbClient } from '../../../../database/db.service';
import { toNumber } from '../../../../common/utils/numbers';
import {
  StockTransferEntity,
  StockTransferItemEntity,
} from '../domain/entities/stock-transfer.entity';

interface TransferRow {
  id: string;
  org_id: string;
  source_branch_id: string;
  dest_branch_id: string;
  source_branch_name: string | null;
  dest_branch_name: string | null;
  transfer_number: string;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  voided_at: Date | null;
}

interface TransferItemRow {
  id: string;
  transfer_id: string;
  product_id: string;
  product_name: string | null;
  quantity: string;
}

/**
 * Aplica un delta de stock a una sucursal de forma atomica (con bloqueo de fila).
 * Crea la fila de inventory_stock si no existe. Lanza si el stock quedaria negativo.
 * Reutiliza el mismo patron que create-inventory-movement.usecase.
 */
export async function applyStockDelta(
  client: DbClient,
  orgId: string,
  branchId: string,
  productId: string,
  delta: number,
): Promise<number> {
  let [stock] = await client.query<{ id: string; quantity_on_hand: string }>(
    `SELECT id, quantity_on_hand
     FROM inventory_stock
     WHERE org_id = $1 AND branch_id = $2 AND product_id = $3
     FOR UPDATE`,
    [orgId, branchId, productId],
  );

  if (!stock) {
    const created = await client.query<{ id: string; quantity_on_hand: string }>(
      `INSERT INTO inventory_stock (org_id, branch_id, product_id, quantity_on_hand, min_stock)
       VALUES ($1, $2, $3, 0, 0)
       RETURNING id, quantity_on_hand`,
      [orgId, branchId, productId],
    );
    stock = created[0];
  }

  const next = toNumber(stock.quantity_on_hand) + delta;
  if (next < 0) {
    throw new BadRequestException('Stock insuficiente para el traspaso');
  }

  await client.execute(`UPDATE inventory_stock SET quantity_on_hand = $1 WHERE id = $2`, [
    next,
    stock.id,
  ]);

  return next;
}

export async function recordTransferMovement(
  client: DbClient,
  orgId: string,
  branchId: string,
  productId: string,
  movementType: 'transfer_in' | 'transfer_out',
  quantity: number,
  transferId: string,
): Promise<void> {
  await client.execute(
    `INSERT INTO inventory_movements (org_id, branch_id, product_id, movement_type, quantity, reference_type, reference_id)
     VALUES ($1, $2, $3, $4, $5, 'stock_transfer', $6)`,
    [orgId, branchId, productId, movementType, quantity, transferId],
  );
}

export async function loadTransfer(
  client: DbClient,
  transferId: string,
): Promise<StockTransferEntity | null> {
  const [transfer] = await client.query<TransferRow>(
    `SELECT t.id, t.org_id, t.source_branch_id, t.dest_branch_id,
            sb.name AS source_branch_name, db.name AS dest_branch_name,
            t.transfer_number, t.status, t.notes,
            t.created_at, t.updated_at, t.completed_at, t.voided_at
     FROM stock_transfers t
     LEFT JOIN branches sb ON sb.id = t.source_branch_id
     LEFT JOIN branches db ON db.id = t.dest_branch_id
     WHERE t.id = $1`,
    [transferId],
  );

  if (!transfer) return null;

  const items = await client.query<TransferItemRow>(
    `SELECT i.id, i.transfer_id, i.product_id, p.name AS product_name, i.quantity
     FROM stock_transfer_items i
     LEFT JOIN products p ON p.id = i.product_id
     WHERE i.transfer_id = $1
     ORDER BY i.created_at ASC`,
    [transferId],
  );

  return mapTransfer(transfer, items);
}

export function mapTransfer(
  transfer: TransferRow,
  items: TransferItemRow[],
): StockTransferEntity {
  const mappedItems: StockTransferItemEntity[] = items.map((item) => ({
    id: item.id,
    transferId: item.transfer_id,
    productId: item.product_id,
    productName: item.product_name ?? null,
    quantity: toNumber(item.quantity),
  }));

  return {
    id: transfer.id,
    orgId: transfer.org_id,
    sourceBranchId: transfer.source_branch_id,
    sourceBranchName: transfer.source_branch_name ?? null,
    destBranchId: transfer.dest_branch_id,
    destBranchName: transfer.dest_branch_name ?? null,
    transferNumber: transfer.transfer_number,
    status: transfer.status as StockTransferEntity['status'],
    notes: transfer.notes ?? null,
    items: mappedItems,
    createdAt: transfer.created_at.toISOString(),
    updatedAt: transfer.updated_at.toISOString(),
    completedAt: transfer.completed_at ? transfer.completed_at.toISOString() : null,
    voidedAt: transfer.voided_at ? transfer.voided_at.toISOString() : null,
  };
}
