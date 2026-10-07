export type OrganizationStatus = 'active' | 'suspended';

export interface OrganizationEntity {
  id: string;
  name: string;
  taxId?: string | null;
  timezone: string;
  status: OrganizationStatus;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  /** Condiciones que se imprimen en el comprobante de una venta adelantada. */
  advanceSaleTerms?: string | null;
  createdAt: string;
  updatedAt: string;
}
