import type { RlsContext } from '../../database/db.service';
import type { JwtUser } from '../auth/jwt-user';
import type { TenantContext } from './tenant-context';

export const buildRlsContext = (user?: JwtUser, tenant?: TenantContext): RlsContext => ({
  userId: user?.sub ?? null,
  orgId: tenant?.orgId ?? null,
  memberId: tenant?.memberId ?? null,
  isSuperAdmin: user?.isSuperAdmin ?? false,
});
