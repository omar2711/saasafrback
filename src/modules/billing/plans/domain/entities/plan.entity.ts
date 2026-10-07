export type PlanStatus = 'active' | 'archived';

export interface PlanEntity {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
  currency?: string;
  features?: Record<string, number | null>;
}
