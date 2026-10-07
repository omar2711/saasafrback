import { BadRequestException } from '@nestjs/common';
import { DbClient } from '../../../../database/db.service';
import { toNumber } from '../../../../common/utils/numbers';
import { InvoiceEntity } from '../domain/entities/invoice.entity';

export interface InvoiceRow {
  id: string;
  org_id: string;
  sale_id: string;
  invoice_number: string;
  status: string;
  issued_at: Date;
  due_date: Date | null;
  subtotal: string;
  tax_total: string;
  total: string;
  created_at: Date;
  updated_at: Date;
}

export const INVOICE_COLUMNS =
  'id, org_id, sale_id, invoice_number, status, issued_at, due_date, subtotal, tax_total, total, created_at, updated_at';

export function mapInvoice(row: InvoiceRow): InvoiceEntity {
  return {
    id: row.id,
    orgId: row.org_id,
    saleId: row.sale_id,
    invoiceNumber: row.invoice_number,
    status: row.status as InvoiceEntity['status'],
    issuedAt: row.issued_at.toISOString(),
    dueDate: row.due_date ? row.due_date.toISOString() : null,
    subtotal: toNumber(row.subtotal),
    taxTotal: toNumber(row.tax_total),
    total: toNumber(row.total),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * Una factura necesita a quien se le emite. El frontend lo bloquea antes, pero
 * la regla vive aqui por el mismo motivo que el rango de precios: un curl no
 * pasa por el formulario.
 */
export function assertInvoiceCustomerData(
  clientName: string | null | undefined,
  clientNit: string | null | undefined,
): void {
  if (!clientName?.trim() || !clientNit?.trim()) {
    throw new BadRequestException(
      'Para emitir factura se requieren NIT y razon social del cliente',
    );
  }
}

/**
 * Reserva el correlativo con el contador de la 029 (`app.next_document_number`),
 * no con un COUNT(*): dos ventas concurrentes leerian el mismo valor y la
 * segunda moriria contra UNIQUE (org_id, invoice_number).
 *
 * Se llama DENTRO de la transaccion de la venta: si la venta hace ROLLBACK el
 * numero tampoco se quema.
 */
export async function issueInvoice(
  client: DbClient,
  orgId: string,
  saleId: string,
  totals: { subtotal: number | string; taxTotal: number | string; total: number | string },
  options: { dueDate?: Date | null; invoiceNumber?: string } = {},
): Promise<InvoiceEntity> {
  let invoiceNumber = options.invoiceNumber;

  if (!invoiceNumber) {
    const [counter] = await client.query<{ next: string }>(
      'SELECT app.next_document_number($1::uuid, $2) AS next',
      [orgId, 'invoice'],
    );
    invoiceNumber = `FAC-${String(counter.next).padStart(5, '0')}`;
  }

  const [invoice] = await client.query<InvoiceRow>(
    `INSERT INTO invoices (org_id, sale_id, invoice_number, status, issued_at, due_date, subtotal, tax_total, total)
     VALUES ($1, $2, $3, 'issued', now(), $4, $5, $6, $7)
     RETURNING ${INVOICE_COLUMNS}`,
    [orgId, saleId, invoiceNumber, options.dueDate ?? null, totals.subtotal, totals.taxTotal, totals.total],
  );

  return mapInvoice(invoice);
}

/**
 * Anular la venta anula su factura, pero el numero NO se reutiliza: una factura
 * anulada conserva su correlativo, que es justo lo que la hace auditable.
 */
export async function voidInvoiceForSale(client: DbClient, saleId: string): Promise<boolean> {
  const rows = await client.query<{ id: string }>(
    `UPDATE invoices
        SET status = 'voided'
      WHERE sale_id = $1 AND status <> 'voided' AND deleted_at IS NULL
      RETURNING id`,
    [saleId],
  );
  return rows.length > 0;
}
