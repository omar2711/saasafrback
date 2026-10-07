export type KitStatus = 'active' | 'inactive';

export interface KitItemEntity {
  id: string;
  kitId: string;
  productId: string;
  productName?: string | null;
  productCostPrice?: number | null;
  quantity: number;
}

export interface KitEntity {
  id: string;
  orgId: string;
  sku: string;
  name: string;
  description?: string | null;
  salePrice: number;
  status: KitStatus;
  items: KitItemEntity[];
  componentsTotal?: number;
  createdAt: string;
  updatedAt: string;
}
