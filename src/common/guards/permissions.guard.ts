import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtUser } from '../auth/jwt-user';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (required.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ permissions?: string[]; user?: JwtUser }>();

    // El super admin opera sobre organizaciones donde no tiene rol asignado, asi
    // que TenantGuard le deja la lista de permisos vacia. Sin esta salida
    // quedaria fuera de todo el panel en cuanto se empiece a exigir permisos.
    if (request.user?.isSuperAdmin) {
      return true;
    }

    const granted = request.permissions ?? [];
    const missing = required.filter((permission) => !granted.includes(permission));

    if (missing.length > 0) {
      throw new ForbiddenException({
        message: 'No tienes permiso para realizar esta accion.',
        code: 'MISSING_PERMISSION',
        details: missing,
      });
    }

    return true;
  }
}
