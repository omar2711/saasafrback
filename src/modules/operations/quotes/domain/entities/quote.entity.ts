import { QuoteItemEntity } from './quote-item.entity';

export type QuoteStatus =
  | 'pending'
  | 'sent'
  | 'approved'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'converted';

export interface QuoteEntity {
  id: string;
  orgId: string;
  branchId: string;
  branchName?: string | null;
  customerId?: string | null;
  quoteNumber: string;
  status: QuoteStatus;
  validUntil?: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  notes?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  clientEmail?: string | null;
  clientCompany?: string | null;
  clientNit?: string | null;
  clientAddress?: string | null;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
  items?: QuoteItemEntity[];
}
