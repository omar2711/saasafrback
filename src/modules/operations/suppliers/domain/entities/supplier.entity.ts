export type SupplierStatus = 'active' | 'inactive';

export interface SupplierEntity {
  id: string;
  orgId: string;
  name: string;
  taxId?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  /** Departamento / estado / provincia. */
  stateRegion?: string | null;
  /** Pais / region. */
  location?: string | null;
  company?: string | null;
  notes?: string | null;
  status: SupplierStatus;
  createdAt: string;
  updatedAt: string;
}
