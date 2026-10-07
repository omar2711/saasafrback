export interface PurchaseOrderItemEntity {
  id: string;
  orgId: string;
  purchaseOrderId: string;
  productId: string;
  productName?: string | null;
  productSku?: string | null;
  productUnit?: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  createdAt: string;
}
