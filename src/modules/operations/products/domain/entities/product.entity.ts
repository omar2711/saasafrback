export type ProductStatus = 'active' | 'inactive' | 'pending_pricing';

export interface ProductEntity {
  id: string;
  orgId: string;
  sku: string;
  name: string;
  category?: string | null;
  categoryId?: string | null;
  description?: string | null;
  salePrice: number;
  costPrice?: number | null;
  /** Rango autorizado de venta. null = sin limite por ese extremo. */
  minSalePrice?: number | null;
  maxSalePrice?: number | null;
  unit?: string | null;
  imageUrl?: string | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}
