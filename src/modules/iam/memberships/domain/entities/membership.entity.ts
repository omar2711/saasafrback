export type MembershipStatus = 'active' | 'invited' | 'disabled';

export interface MembershipEntity {
  id: string;
  orgId: string;
  userId: string;
  roleIds: string[];
  branchId: string | null;
  /** NIT/CI del miembro, unico dentro de la organizacion (migracion 031). */
  taxId?: string | null;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipInviteEntity {
  id: string;
  orgId: string;
  email: string;
  roleIds: string[];
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
  expiresAt: string;
}
