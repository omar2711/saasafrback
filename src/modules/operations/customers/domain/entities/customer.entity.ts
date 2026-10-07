export type CustomerStatus = 'active' | 'inactive';

export interface CustomerEntity {
  id: string;
  orgId: string;
  name: string;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  /**
   * Agregados de compra. Solo los devuelve el listado; get/create/update no los
   * calculan porque nadie los usa ahi y encarecerian cada escritura.
   */
  salesCount?: number;
  salesTotal?: number;
  lastPurchaseAt?: string | null;
}
