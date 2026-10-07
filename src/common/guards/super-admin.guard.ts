import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtUser } from '../auth/jwt-user';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtUser }>();
    if (!request.user?.isSuperAdmin) {
      throw new ForbiddenException('Super admin required');
    }

    return true;
  }
}
