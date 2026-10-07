export type ProductCategoryStatus = 'active' | 'inactive';

export interface ProductCategoryEntity {
  id: string;
  orgId: string;
  name: string;
  description?: string | null;
  status: ProductCategoryStatus;
  productCount: number;
  productCountInBranch?: number | null;
  stockInBranch?: number | null;
  createdAt: string;
  updatedAt: string;
}
