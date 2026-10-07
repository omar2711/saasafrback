export interface JwtUser {
  sub: string;
  email?: string;
  sessionId?: string;
  permissions?: string[];
  isSuperAdmin?: boolean;
  platformRole?: 'super_admin' | 'accountant' | null;
}
