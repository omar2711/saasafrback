import { BadRequestException } from '@nestjs/common';
import { DbClient } from '../../../../database/db.service';
import { toNumber } from '../../../../common/utils/numbers';

export interface SaleStockLine {
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface SaleLineInput {
  productId?: string | null;
  kitId?: string | null;
  quantity: number;
}

export interface KitPricing {
  salePrice: number;
  unitCost: number;
}

/**
 * Resuelve precio de venta propio y costo unitario (suma de costos de sus
 * componentes) para un conjunto de kits. Usado para las lineas de kit al
 * crear una venta o cotizacion.
 */
export async function resolveKitPricing(
  client: DbClient,
  kitIds: string[],
): Promise<Map<string, KitPricing>> {
  const priceMap = new Map<string, KitPricing>();
  if (kitIds.length === 0) return priceMap;

  const rows = await client.query<{ kit_id: string; sale_price: string; unit_cost: string | null }>(
    `SELECT k.id AS kit_id, k.sale_price,
            COALESCE(SUM(p.cost_price * ki.quantity), 0) AS unit_cost
     FROM kits k
     JOIN kit_items ki ON ki.kit_id = k.id
     JOIN products p ON p.id = ki.product_id
     WHERE k.id = ANY($1::uuid[])
     GROUP BY k.id, k.sale_price`,
    [kitIds],
  );

  for (const row of rows) {
    priceMap.set(row.kit_id, {
      salePrice: toNumber(row.sale_price),
      unitCost: toNumber(row.unit_cost),
    });
  }

  return priceMap;
}

/**
 * Expande lineas de producto y de kit a su impacto real en inventory_stock
 * (una linea de kit se descompone en un impacto por cada producto componente,
 * cantidad = cantidad_linea * cantidad_por_kit). Valida que cada componente
 * de un kit siga activo y no eliminado al momento de la venta.
 */
export async function resolveLineStockImpacts(
  client: DbClient,
  lines: SaleLineInput[],
): Promise<SaleStockLine[]> {
  const impacts: SaleStockLine[] = [];

  const productIds = Array.from(
    new Set(lines.filter((l) => l.productId).map((l) => l.productId as string)),
  );
  if (productIds.length > 0) {
    const products = await client.query<{ id: string; cost_price: string | null }>(
      `SELECT id, cost_price FROM products WHERE id = ANY($1::uuid[])`,
      [productIds],
    );
    const costMap = new Map(products.map((p) => [p.id, toNumber(p.cost_price)]));
    for (const line of lines) {
      if (line.productId) {
        const unitCost = costMap.get(line.productId) ?? 0;
        impacts.push({
          productId: line.productId,
          quantity: line.quantity,
          unitCost,
          totalCost: unitCost * line.quantity,
        });
      }
    }
  }

  const kitIds = Array.from(new Set(lines.filter((l) => l.kitId).map((l) => l.kitId as string)));
  if (kitIds.length > 0) {
    const kitItems = await client.query<{
      kit_id: string;
      product_id: string;
      quantity: string;
      cost_price: string | null;
      product_status: string;
      product_deleted_at: Date | null;
    }>(
      `SELECT ki.kit_id, ki.product_id, ki.quantity, p.cost_price,
              p.status AS product_status, p.deleted_at AS product_deleted_at
       FROM kit_items ki
       JOIN products p ON p.id = ki.product_id
       WHERE ki.kit_id = ANY($1::uuid[])`,
      [kitIds],
    );

    const itemsByKit = new Map<string, typeof kitItems>();
    for (const item of kitItems) {
      const list = itemsByKit.get(item.kit_id) ?? [];
      list.push(item);
      itemsByKit.set(item.kit_id, list);
    }

    for (const line of lines) {
      if (line.kitId) {
        const components = itemsByKit.get(line.kitId) ?? [];
        for (const component of components) {
          if (component.product_deleted_at || component.product_status !== 'active') {
            throw new BadRequestException('El kit contiene un producto no disponible');
          }
          const quantity = toNumber(component.quantity) * line.quantity;
          const unitCost = toNumber(component.cost_price);
          impacts.push({
            productId: component.product_id,
            quantity,
            unitCost,
            totalCost: unitCost * quantity,
          });
        }
      }
    }
  }

  return impacts;
}

/**
 * Descuenta stock por cada linea (con bloqueo de fila) y registra un movimiento
 * 'sale'. Lanza BadRequestException si falta el registro de stock o si quedaria negativo.
 * Usado al crear una venta y al convertir una cotizacion en venta.
 */
export async function applyStockDecrementAndRecordMovement(
  client: DbClient,
  orgId: string,
  branchId: string,
  referenceId: string,
  lines: SaleStockLine[],
  referenceType: string = 'sale',
): Promise<void> {
  for (const line of lines) {
    const [stock] = await client.query<{ id: string; quantity_on_hand: string }>(
      `SELECT id, quantity_on_hand
       FROM inventory_stock
       WHERE org_id = $1 AND branch_id = $2 AND product_id = $3
       FOR UPDATE`,
      [orgId, branchId, line.productId],
    );

    if (!stock) {
      throw new BadRequestException('No se encontro registro de stock para el producto');
    }

    const current = toNumber(stock.quantity_on_hand);
    const next = current - line.quantity;
    if (next < 0) {
      throw new BadRequestException('Stock insuficiente');
    }

    await client.execute(`UPDATE inventory_stock SET quantity_on_hand = $1 WHERE id = $2`, [
      next,
      stock.id,
    ]);

    await client.execute(
      `INSERT INTO inventory_movements (
         org_id, branch_id, product_id, movement_type,
         quantity, unit_cost, total_cost, reference_type, reference_id
       )
       VALUES ($1, $2, $3, 'sale', $4, $5, $6, $7, $8)`,
      [orgId, branchId, line.productId, line.quantity, line.unitCost, line.totalCost, referenceType, referenceId],
    );
  }
}

/**
 * Repone stock por cada linea (incremento simple, sin bloqueo) y registra un
 * movimiento 'return'. Usado al anular una venta y al registrar una devolucion.
 */
export async function restockAndRecordMovement(
  client: DbClient,
  orgId: string,
  branchId: string,
  lines: SaleStockLine[],
  referenceType: string,
  referenceId: string,
): Promise<void> {
  for (const line of lines) {
    await client.execute(
      `UPDATE inventory_stock
       SET quantity_on_hand = quantity_on_hand + $1
       WHERE org_id = $2 AND branch_id = $3 AND product_id = $4`,
      [line.quantity, orgId, branchId, line.productId],
    );

    await client.execute(
      `INSERT INTO inventory_movements (
         org_id, branch_id, product_id, movement_type,
         quantity, unit_cost, total_cost, reference_type, reference_id
       )
       VALUES ($1, $2, $3, 'return', $4, $5, $6, $7, $8)`,
      [orgId, branchId, line.productId, line.quantity, line.unitCost, line.totalCost, referenceType, referenceId],
    );
  }
}
