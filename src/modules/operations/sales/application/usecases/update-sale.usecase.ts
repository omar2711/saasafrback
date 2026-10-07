import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { SaleEntity } from '../../domain/entities/sale.entity';
import { UpdateSaleDto } from '../../presentation/dto/update-sale.dto';

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

@Injectable()
export class UpdateSaleUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, saleId: string, dto: UpdateSaleDto): Promise<SaleEntity> {
    if (dto.status === 'voided') {
      throw new BadRequestException('Use POST /operations/sales/:id/void para anular una venta');
    }

    const result = await this.db.withRls(context, async (client) => {
      const [current] = await client.query<{ status: string }>(
        `SELECT status FROM sales WHERE id = $1 AND deleted_at IS NULL`,
        [saleId],
      );

      if (!current) {
        return null;
      }

      if (current.status === 'voided') {
        throw new BadRequestException('La venta ya fue anulada');
      }

      const [updated] = await client.query<SaleRow>(
        `UPDATE sales
         SET status = COALESCE($1::text, status),
             payment_method = COALESCE($2::text, payment_method),
             client_name = COALESCE($3::text, client_name)
         WHERE id = $4
         RETURNING id, org_id, branch_id, customer_id, quote_id, sale_number, status, sold_at,
                   subtotal, discount_total, tax_total, total, cost_total, client_name, payment_method,
                   voided_at, delivered_at, created_at, updated_at`,
        [dto.status ?? null, dto.paymentMethod ?? null, dto.clientName ?? null, saleId],
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
