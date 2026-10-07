import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { AuditService } from '../../../../../common/audit/audit.service';
import { toNumber } from '../../../../../common/utils/numbers';
import {
  resolveLineStockImpacts,
  restockAndRecordMovement,
  SaleStockLine,
} from '../sale-stock-helpers';
import { voidInvoiceForSale } from '../invoice-helpers';
import { SaleEntity } from '../../domain/entities/sale.entity';

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
  document_type: string;
  created_at: Date;
  updated_at: Date;
}

interface SaleItemLineRow {
  product_id: string | null;
  kit_id: string | null;
  quantity: string;
}

@Injectable()
export class VoidSaleUseCase {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async execute(context: RlsContext, saleId: string): Promise<SaleEntity> {
    const result = await this.db.withRls(context, async (client) => {
      const [sale] = await client.query<SaleRow>(
        `SELECT id, org_id, branch_id, customer_id, quote_id, sale_number, status, sold_at,
                subtotal, discount_total, tax_total, total, cost_total, client_name, payment_method,
                voided_at, delivered_at, document_type, created_at, updated_at
         FROM sales
         WHERE id = $1 AND deleted_at IS NULL
         FOR UPDATE`,
        [saleId],
      );

      if (!sale) return null;

      if (sale.status === 'voided') {
        throw new BadRequestException('La venta ya fue anulada');
      }

      const [{ count }] = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM sale_returns sr
         WHERE sr.sale_id = $1 AND sr.status <> 'voided'`,
        [saleId],
      );
      if (Number(count) > 0) {
        throw new BadRequestException(
          'No se puede anular una venta con devoluciones registradas; anule primero las devoluciones',
        );
      }

      if (sale.status !== 'pending_delivery') {
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

        await restockAndRecordMovement(client, sale.org_id, sale.branch_id, stockLines, 'sale', saleId);
      }

      // La factura cae con la venta, pero su numero NO se reutiliza: una factura
      // anulada conserva el correlativo, que es lo que la hace auditable.
      const invoiceVoided = await voidInvoiceForSale(client, saleId);

      const [updated] = await client.query<SaleRow>(
        `UPDATE sales
         SET status = 'voided', voided_at = now()
         WHERE id = $1
         RETURNING id, org_id, branch_id, customer_id, quote_id, sale_number, status, sold_at,
                   subtotal, discount_total, tax_total, total, cost_total, client_name, payment_method,
                   voided_at, delivered_at, document_type, created_at, updated_at`,
        [saleId],
      );

      // Dentro de la transaccion: si la anulacion hace ROLLBACK, el asiento se
      // va con ella. Un interceptor registraria una anulacion que no ocurrio.
      await this.audit.recordInTransaction(client, context, {
        action: 'sale.void',
        entityType: 'sale',
        entityId: saleId,
        metadata: {
          saleNumber: sale.sale_number,
          total: toNumber(sale.total),
          previousStatus: sale.status,
          restockedInventory: sale.status !== 'pending_delivery',
          invoiceVoided,
        },
      });

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
      documentType: result.document_type as SaleEntity['documentType'],
      createdAt: result.created_at.toISOString(),
      updatedAt: result.updated_at.toISOString(),
    };
  }
}
