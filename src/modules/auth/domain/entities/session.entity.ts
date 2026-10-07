export interface SessionEntity {
  id: string;
  userId: string;
  refreshToken: string;
  ip?: string | null;
  userAgent?: string | null;
  revoked: boolean;
  expiresAt: string;
  createdAt: string;
}
