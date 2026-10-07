import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { InvoiceEntity } from '../../domain/entities/invoice.entity';
import { CreateInvoiceDto } from '../../presentation/dto/create-invoice.dto';
import { assertInvoiceCustomerData, issueInvoice } from '../invoice-helpers';

interface SaleTotalsRow {
  id: string;
  org_id: string;
  subtotal: string;
  tax_total: string;
  total: string;
  status: string;
  client_name: string | null;
  client_nit: string | null;
  customer_name: string | null;
  customer_tax_id: string | null;
}

/**
 * Emision de factura a posteriori: una venta que se cobro con recibo y que el
 * cliente pide facturar despues. El caso normal (facturar al cobrar) va dentro
 * de la transaccion de create-sale y no pasa por aqui.
 */
@Injectable()
export class CreateInvoiceUseCase {
  constructor(private readonly db: DbService) {}

  async execute(
    context: RlsContext,
    saleId: string,
    dto: CreateInvoiceDto,
  ): Promise<InvoiceEntity> {
    const result = await this.db.withRls(context, async (client) => {
      const [sale] = await client.query<SaleTotalsRow>(
        `SELECT s.id, s.org_id, s.subtotal, s.tax_total, s.total, s.status,
                s.client_name, s.client_nit,
                c.name AS customer_name, c.tax_id AS customer_tax_id
         FROM sales s
         LEFT JOIN customers c ON c.id = s.customer_id
         WHERE s.id = $1 AND s.deleted_at IS NULL`,
        [saleId],
      );

      if (!sale) {
        return null;
      }

      if (sale.status === 'voided') {
        throw new BadRequestException('No se puede facturar una venta anulada');
      }

      const existing = await client.query<{ id: string }>(
        `SELECT id FROM invoices WHERE sale_id = $1 AND deleted_at IS NULL`,
        [saleId],
      );

      if (existing.length > 0) {
        throw new BadRequestException('Esta venta ya tiene una factura emitida');
      }

      assertInvoiceCustomerData(
        sale.customer_name ?? sale.client_name,
        sale.customer_tax_id ?? sale.client_nit,
      );

      const invoice = await issueInvoice(
        client,
        sale.org_id,
        saleId,
        { subtotal: sale.subtotal, taxTotal: sale.tax_total, total: sale.total },
        {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          invoiceNumber: dto.invoiceNumber,
        },
      );

      // La venta pasa a ser "con factura": es el dato que decide que documento
      // se reimprime desde el historial.
      await client.execute(`UPDATE sales SET document_type = 'invoice' WHERE id = $1`, [saleId]);

      return invoice;
    });

    if (!result) {
      throw new NotFoundException('Venta no encontrada');
    }

    return result;
  }
}
