export interface SaleItemEntity {
  id: string;
  orgId: string;
  saleId: string;
  productId: string | null;
  productName?: string | null;
  productSku?: string | null;
  kitId?: string | null;
  kitName?: string | null;
  purchaseOrderId?: string | null;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discount: number;
  total: number;
  totalCost: number;
  createdAt: string;
}
