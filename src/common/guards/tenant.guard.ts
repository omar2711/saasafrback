import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DbService } from '../../database/db.service';
import { JwtUser } from '../auth/jwt-user';
import { TenantContext } from '../tenant/tenant-context';
import { isUuid } from '../utils/uuid';
import { WorkScheduleService } from '../schedule/work-schedule.service';

interface MembershipRow {
  membership_id: string;
  org_id: string;
  user_id: string;
  role_id: string | null;
  permission_code: string | null;
}

interface FeatureRow {
  feature_code: string;
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly db: DbService,
    private readonly workSchedule: WorkScheduleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{
        path?: string;
        url?: string;
        tenant?: TenantContext;
        user?: JwtUser;
        permissions?: string[];
        planFeatures?: string[];
      }>();

    if (request.user?.platformRole === 'accountant')
      throw new ForbiddenException(
        'El contable solo puede consultar los reportes económicos de AFR.',
      );

    const orgId = request.tenant?.orgId;
    if (!orgId || !isUuid(orgId)) {
      throw new ForbiddenException('Tenant context missing');
    }

    if (!request.user?.sub || !isUuid(request.user.sub)) {
      throw new UnauthorizedException('Missing user context');
    }

    const userId = request.user.sub;
    const isSuperAdmin = request.user.isSuperAdmin ?? false;

    if (!isSuperAdmin) {
      const [org] = await this.db.withContextQuery<{ status: string }[]>(
        userId,
        orgId,
        false,
        (c) =>
          c.query(
            'SELECT status FROM orgs WHERE id=$1 AND deleted_at IS NULL',
            [orgId],
          ),
      );
      if (!org || org.status !== 'active')
        throw new ForbiddenException(
          'La organización está suspendida o no está disponible.',
        );
    }

    let rows: MembershipRow[];
    try {
      rows = await this.db.withContextQuery<MembershipRow[]>(
        userId,
        orgId,
        isSuperAdmin,
        (client) =>
          client.query<MembershipRow>(
            `SELECT om.id AS membership_id, om.org_id, om.user_id,
                    ur.role_id, p.code AS permission_code
             FROM org_members om
             LEFT JOIN user_roles ur ON ur.org_member_id = om.id
             LEFT JOIN roles r ON r.id = ur.role_id
             LEFT JOIN role_permissions rp ON rp.role_id = r.id
             LEFT JOIN permissions p ON p.id = rp.permission_id
             WHERE om.org_id = $1 AND om.user_id = $2 AND om.deleted_at IS NULL AND om.status = 'active'`,
            [orgId, userId],
          ),
      );
    } catch (err) {
      console.error('[TenantGuard] DB error querying membership:', err);
      throw err;
    }

    // El super admin opera sobre organizaciones donde no tiene membresia: es lo
    // que asumen app.is_super_admin() en RLS, SuperAdminGuard y el flag de
    // buildRlsContext. Sin esta salida no podria ni atender un ticket de
    // soporte, que es justo su trabajo.
    if (rows.length === 0 && !isSuperAdmin) {
      throw new ForbiddenException({
        message: 'No tienes acceso a esta organizacion.',
        code: 'NOT_A_MEMBER',
      });
    }

    const first = rows[0];
    const roleIds = [
      ...new Set(rows.filter((r) => r.role_id).map((r) => r.role_id!)),
    ];
    const permissions = [
      ...new Set(
        rows.filter((r) => r.permission_code).map((r) => r.permission_code!),
      ),
    ];

    request.tenant = {
      orgId,
      // Sin membresia (super admin) no hay memberId: RLS ya lo deja pasar por
      // app.is_super_admin() y no por app.member_id().
      memberId: first?.membership_id ?? undefined,
      roles: roleIds,
    };
    request.permissions = permissions;

    // Bloqueo tambien aqui y no solo en el login: una sesion abierta antes de
    // que empezara el horario seguiria operando toda la noche. El super admin y
    // quien tiene settings.write quedan fuera por diseno (ver migracion 031).
    if (!isSuperAdmin) {
      await this.workSchedule.assertCanOperate(orgId, userId);
    }

    try {
      const featureRows = await this.db.withContextQuery<FeatureRow[]>(
        userId,
        orgId,
        isSuperAdmin,
        (client) =>
          client.query<FeatureRow>(
            `SELECT pf.code AS feature_code
             FROM subscriptions s
             JOIN plan_feature_limits pfl ON pfl.plan_id = s.plan_id
             JOIN plan_features pf ON pf.id = pfl.feature_id
             WHERE s.org_id = $1
               AND s.status IN ('active', 'past_due')
               AND s.start_date <= CURRENT_DATE
               AND (s.end_date IS NULL OR s.end_date + s.grace_days >= CURRENT_DATE)
               AND (pfl.limit_value IS NULL OR pfl.limit_value > 0)
               AND s.deleted_at IS NULL`,
            [orgId],
          ),
      );
      request.planFeatures = featureRows.map((r) => r.feature_code);
    } catch {
      request.planFeatures = [];
    }

    if (!isSuperAdmin) {
      const path = request.path ?? request.url ?? '';
      const modules: [string, string][] = [
        ['/operations/inventory/transfers', 'module_transfers'],
        ['/operations/pricing', 'module_inventory'],
        ['/operations/products', 'module_inventory'],
        ['/operations/categories', 'module_inventory'],
        ['/operations/inventory', 'module_inventory'],
        ['/operations/sales', 'module_sales'],
        ['/operations/sale-returns', 'module_sales'],
        ['/operations/customers', 'module_customers'],
        ['/operations/suppliers', 'module_suppliers'],
        ['/operations/purchases', 'module_purchases'],
        ['/purchases', 'module_purchases'],
        ['/operations/quotes', 'module_quotes'],
        ['/operations/transfers', 'module_transfers'],
        ['/operations/kits', 'module_kits'],
        ['/operations/petty-cash', 'module_petty_cash'],
        ['/audit', 'module_audit'],
      ];
      const feature = modules.find(([prefix]) => path.startsWith(prefix))?.[1];
      if (feature && !request.planFeatures.includes(feature))
        throw new ForbiddenException({
          message:
            'Este módulo no está disponible en el plan vigente de tu empresa.',
          code: 'PLAN_MODULE_DISABLED',
        });
    }

    return true;
  }
}
