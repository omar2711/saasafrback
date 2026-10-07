export type SaleReturnStatus = 'completed' | 'voided';

/**
 * 'restock': el producto vuelve al inventario vendible.
 * 'damaged': entra y se da de baja en el mismo acto (movimientos +return y -damage).
 */
export type SaleReturnCondition = 'restock' | 'damaged';

export interface SaleReturnItemEntity {
  id: string;
  returnId: string;
  saleItemId: string;
  productId?: string | null;
  productName?: string | null;
  kitId?: string | null;
  kitName?: string | null;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  condition: SaleReturnCondition;
  notes?: string | null;
}

export interface SaleReturnEntity {
  id: string;
  orgId: string;
  saleId: string;
  saleNumber?: string | null;
  branchId?: string | null;
  returnNumber: string;
  status: SaleReturnStatus;
  reason?: string | null;
  refundTotal: number;
  items: SaleReturnItemEntity[];
  createdAt: string;
  updatedAt: string;
  voidedAt?: string | null;
}
