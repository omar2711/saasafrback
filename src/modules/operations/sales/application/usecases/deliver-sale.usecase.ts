import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import {
  applyStockDecrementAndRecordMovement,
  resolveLineStockImpacts,
  SaleStockLine,
} from '../sale-stock-helpers';
import { SaleEntity } from '../../domain/entities/sale.entity';
import { DeliverSaleDto } from '../../presentation/dto/deliver-sale.dto';

interface SaleRow {
  id: string;
  org_id: string;
  branch_id: string;
  customer_id: string | null;
  quote_id: string | null;
  sale_number: string;
  status: string;
  sold_at: Date;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
  cost_total: string;
  client_name: string | null;
  payment_method: string | null;
  voided_at: Date | null;
  delivered_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface SaleItemLineRow {
  product_id: string | null;
  kit_id: string | null;
  quantity: string;
}

interface PaidTotalRow {
  paid_total: string | null;
}

@Injectable()
export class DeliverSaleUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, saleId: string, dto?: DeliverSaleDto): Promise<SaleEntity> {
    const result = await this.db.withRls(context, async (client) => {
      const [sale] = await client.query<SaleRow>(
        `SELECT id, org_id, branch_id, customer_id, quote_id, sale_number, status, sold_at,
                subtotal, discount_total, tax_total, total, cost_total, client_name, payment_method,
                voided_at, delivered_at, created_at, updated_at
         FROM sales
         WHERE id = $1 AND deleted_at IS NULL
         FOR UPDATE`,
        [saleId],
      );

      if (!sale) return null;

      if (sale.status !== 'pending_delivery') {
        throw new BadRequestException('Solo se pueden entregar ventas con entrega pendiente');
      }

      // El cobro del saldo va en la MISMA transaccion que la entrega: si se hiciera
      // con dos llamadas desde el frontend, la entrega podria descontar stock y el
      // cobro fallar despues, dejando la venta cerrada y sin pagar.
      if (dto?.payment) {
        const [paid] = await client.query<PaidTotalRow>(
          `SELECT COALESCE(SUM(amount), 0)::text AS paid_total
           FROM payments
           WHERE sale_id = $1 AND status <> 'voided'`,
          [saleId],
        );
        const balanceDue = toNumber(sale.total) - toNumber(paid?.paid_total ?? '0');

        if (balanceDue <= 0) {
          throw new BadRequestException('Esta venta no tiene saldo pendiente');
        }
        if (dto.payment.amount > balanceDue) {
          throw new BadRequestException(
            `El cobro no puede superar el saldo pendiente (${balanceDue})`,
          );
        }

        await client.execute(
          `INSERT INTO payments (org_id, sale_id, amount, method, status, paid_at)
           VALUES ($1, $2, $3, $4, 'completed', $5)`,
          [
            sale.org_id,
            saleId,
            dto.payment.amount,
            dto.payment.method === 'credit' ? 'other' : dto.payment.method,
            dto.payment.paidAt ? new Date(dto.payment.paidAt) : new Date(),
          ],
        );
      }

      const items = await client.query<SaleItemLineRow>(
        `SELECT product_id, kit_id, quantity FROM sale_items WHERE sale_id = $1`,
        [saleId],
      );

      const stockLines: SaleStockLine[] = await resolveLineStockImpacts(
        client,
        items.map((item) => ({
          productId: item.product_id,
          kitId: item.kit_id,
          quantity: toNumber(item.quantity),
        })),
      );
      await applyStockDecrementAndRecordMovement(client, sale.org_id, sale.branch_id, saleId, stockLines);

      const [updated] = await client.query<SaleRow>(
        `UPDATE sales
         SET status = 'completed', delivered_at = now()
         WHERE id = $1
         RETURNING id, org_id, branch_id, customer_id, quote_id, sale_number, status, sold_at,
                   subtotal, discount_total, tax_total, total, cost_total, client_name, payment_method,
                   voided_at, delivered_at, created_at, updated_at`,
        [saleId],
      );

      return updated;
    });

    if (!result) {
      throw new NotFoundException('Venta no encontrada');
    }

    return {
      id: result.id,
      orgId: result.org_id,
      branchId: result.branch_id,
      customerId: result.customer_id ?? null,
      quoteId: result.quote_id ?? null,
      saleNumber: result.sale_number,
      status: result.status as SaleEntity['status'],
      soldAt: result.sold_at.toISOString(),
      subtotal: toNumber(result.subtotal),
      discountTotal: toNumber(result.discount_total),
      taxTotal: toNumber(result.tax_total),
      total: toNumber(result.total),
      costTotal: toNumber(result.cost_total),
      clientName: result.client_name ?? null,
      paymentMethod: (result.payment_method as SaleEntity['paymentMethod']) ?? null,
      voidedAt: result.voided_at ? result.voided_at.toISOString() : null,
      deliveredAt: result.delivered_at ? result.delivered_at.toISOString() : null,
      createdAt: result.created_at.toISOString(),
      updatedAt: result.updated_at.toISOString(),
    };
  }
}
