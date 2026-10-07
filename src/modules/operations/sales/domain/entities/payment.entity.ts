export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';
export type PaymentStatus = 'pending' | 'completed' | 'voided';

export interface PaymentEntity {
  id: string;
  orgId: string;
  saleId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string;
  createdAt: string;
}
