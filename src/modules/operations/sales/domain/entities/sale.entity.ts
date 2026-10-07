import { InvoiceEntity } from './invoice.entity';
import { PaymentEntity } from './payment.entity';
import { SaleItemEntity } from './sale-item.entity';

export type SaleStatus = 'draft' | 'completed' | 'voided' | 'refunded' | 'pending_delivery';
export type SalePaymentMethod = 'cash' | 'card' | 'transfer' | 'credit' | 'other';
/**
 * Con que documento se cobro la venta. Es la intencion, y es inmutable: la
 * factura puede acabar anulada, pero la venta se siguio haciendo con factura y
 * es lo que hay que reimprimir.
 */
export type SaleDocumentType = 'receipt' | 'invoice';

export interface SaleEntity {
  id: string;
  orgId: string;
  branchId: string;
  branchName?: string | null;
  customerId?: string | null;
  quoteId?: string | null;
  saleNumber: string;
  status: SaleStatus;
  soldAt: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  costTotal: number;
  /** Datos del cliente ocasional, capturados en el POS al momento de vender. */
  clientName?: string | null;
  clientNit?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientAddress?: string | null;
  /** Datos vivos del cliente registrado, resueltos por JOIN a customers. */
  customerName?: string | null;
  customerTaxId?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  paymentMethod?: SalePaymentMethod | null;
  soldBy?: string | null;
  soldByName?: string | null;
  voidedAt?: string | null;
  deliveredAt?: string | null;
  documentType?: SaleDocumentType;
  /** Aplanados desde `invoices` para no pedir el detalle en los listados. */
  invoiceNumber?: string | null;
  invoiceStatus?: 'issued' | 'voided' | null;
  itemCount?: number;
  /** Suma de los pagos no anulados. El saldo pendiente es `total - depositTotal`. */
  depositTotal?: number;
  createdAt: string;
  updatedAt: string;
  items?: SaleItemEntity[];
  payments?: PaymentEntity[];
  invoice?: InvoiceEntity | null;
}
