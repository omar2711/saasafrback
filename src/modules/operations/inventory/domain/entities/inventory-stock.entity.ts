export interface InventoryStockEntity {
  id: string;
  orgId: string;
  branchId: string;
  productId: string;
  quantityOnHand: number;
  minStock: number;
  createdAt: string;
  updatedAt: string;
}
