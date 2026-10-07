export type UserStatus = 'active' | 'disabled';

export interface UserEntity {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}
