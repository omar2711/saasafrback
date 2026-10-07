export interface QuoteItemEntity {
  id: string;
  orgId: string;
  quoteId: string;
  productId: string | null;
  kitId?: string | null;
  kitName?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  createdAt: string;
}
