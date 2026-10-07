export type StockTransferStatus = 'in_transit' | 'completed' | 'voided';

export interface StockTransferItemEntity {
  id: string;
  transferId: string;
  productId: string;
  productName?: string | null;
  quantity: number;
}

export interface StockTransferEntity {
  id: string;
  orgId: string;
  sourceBranchId: string;
  sourceBranchName?: string | null;
  destBranchId: string;
  destBranchName?: string | null;
  transferNumber: string;
  status: StockTransferStatus;
  notes?: string | null;
  items: StockTransferItemEntity[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  voidedAt?: string | null;
}
