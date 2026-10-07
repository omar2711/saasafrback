export type SubscriptionStatus = 'active' | 'past_due' | 'canceled';

export interface SubscriptionEntity {
  id: string;
  orgId: string;
  planId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate?: string | null;
  graceDays: number;
  renewalPeriod: 'monthly' | 'yearly';
  createdAt: string;
  updatedAt: string;
}
