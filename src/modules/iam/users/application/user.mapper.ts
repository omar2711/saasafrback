import { UserEntity } from '../domain/entities/user.entity';

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export const mapUser = (row: UserRow): UserEntity => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  phone: row.phone ?? null,
  status: row.status as UserEntity['status'],
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
  deletedAt: row.deleted_at ? row.deleted_at.toISOString() : null,
});
