export type BranchStatus = 'active' | 'inactive';

export interface BranchEntity {
  id: string;
  orgId: string;
  name: string;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  status: BranchStatus;
  /**
   * Encargado / dueno de la sucursal. Apunta a org_members y no a users: el
   * encargado es un rol dentro de ESTA organizacion.
   */
  managerMemberId?: string | null;
  managerName?: string | null;
  /** Sucursal principal. Antes la interfaz lo deducia de la posicion en la lista. */
  isMain?: boolean;
  createdAt: string;
  updatedAt: string;
}
