import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtUser } from '../auth/jwt-user';

export interface GrantedPermissions {
  has(permission: string): boolean;
  /** Lanza 403 con el mismo formato que PermissionsGuard. */
  require(permission: string): void;
  readonly codes: string[];
  readonly isSuperAdmin: boolean;
}

/**
 * Para los casos que PermissionsGuard no puede expresar de forma declarativa:
 * una misma ruta cuyo permiso depende del cuerpo del request (POST
 * /inventory/movements exige inventory.write_off solo si el movimiento es una
 * baja, y no para un ajuste normal).
 */
export const UserPermissions = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): GrantedPermissions => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ permissions?: string[]; user?: JwtUser }>();

    const codes = request.permissions ?? [];
    const isSuperAdmin = request.user?.isSuperAdmin ?? false;

    return {
      codes,
      isSuperAdmin,
      has: (permission: string) => isSuperAdmin || codes.includes(permission),
      require: (permission: string) => {
        if (isSuperAdmin || codes.includes(permission)) {
          return;
        }
        throw new ForbiddenException({
          message: 'No tienes permiso para realizar esta accion.',
          code: 'MISSING_PERMISSION',
          details: [permission],
        });
      },
    };
  },
);
