import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtUser } from '../auth/jwt-user';
import { TenantContext } from '../tenant/tenant-context';
import { TenantGuard } from './tenant.guard';

/**
 * TenantGuard, salvo para el super admin sin organizacion seleccionada.
 *
 * El problema que resuelve: el soporte lo atiende el super admin, que entra
 * directo a /admin y nunca elige un tenant, asi que el cliente no manda
 * `x-tenant-id` y TenantGuard rechazaba la peticion antes de llegar al
 * controlador. Los usecases de soporte ya contemplan al agente sin organizacion
 * (list-tickets cruza organizaciones, get-ticket y add-ticket-message resuelven
 * la org desde el propio ticket), asi que lo unico que sobraba era la cabecera.
 *
 * El atajo se activa SOLO si la cabecera falta Y el usuario es super admin. En
 * cuanto llega una cabecera, se delega en TenantGuard tal cual, con su
 * comprobacion de membresia, permisos y horario laboral: un miembro normal no
 * pierde ninguna verificacion.
 */
@Injectable()
export class OptionalTenantGuard implements CanActivate {
  constructor(private readonly tenantGuard: TenantGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      tenant?: TenantContext;
      user?: JwtUser;
      permissions?: string[];
      planFeatures?: string[];
    }>();

    if (!request.tenant?.orgId && request.user?.isSuperAdmin) {
      request.permissions = [];
      request.planFeatures = [];
      return true;
    }

    return this.tenantGuard.canActivate(context);
  }
}
