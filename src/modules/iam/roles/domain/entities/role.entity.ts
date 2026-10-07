export interface RoleEntity {
  id: string;
  orgId: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}
