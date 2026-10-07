import { PurchaseOrderItemEntity } from './purchase-order-item.entity';

export const PURCHASE_ORDER_STATUSES = [
  'draft',
  'pending',
  'ordered',
  'approved',
  'received',
  'canceled',
] as const;

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export interface PurchaseOrderEntity {
  id: string;
  orgId: string;
  branchId: string;
  branchName?: string | null;
  supplierId: string;
  supplierName?: string | null;
  orderNumber: string;
  status: PurchaseOrderStatus;
  orderedAt?: string | null;
  receivedAt?: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  totalCost: number;
  notes?: string | null;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseOrderItemEntity[];
}
