export type InvoiceStatus = 'issued' | 'voided';

export interface InvoiceEntity {
  id: string;
  orgId: string;
  saleId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issuedAt: string;
  dueDate?: string | null;
  subtotal: number;
  taxTotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}
