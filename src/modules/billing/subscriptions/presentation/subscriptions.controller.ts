import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Tenant } from '../../../../common/decorators/tenant.decorator';
import type { JwtUser } from '../../../../common/auth/jwt-user';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../../common/guards/super-admin.guard';
import { TenantGuard } from '../../../../common/guards/tenant.guard';
import { buildRlsContext } from '../../../../common/tenant/rls-context';
import type { TenantContext } from '../../../../common/tenant/tenant-context';
import { CancelSubscriptionUseCase } from '../application/usecases/cancel-subscription.usecase';
import { CreateSubscriptionUseCase } from '../application/usecases/create-subscription.usecase';
import { GetCurrentSubscriptionUseCase } from '../application/usecases/get-current-subscription.usecase';
import { UpdateSubscriptionUseCase } from '../application/usecases/update-subscription.usecase';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@ApiTags('Billing / Subscriptions')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organización', required: true })
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('billing/subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly createSubscriptionUseCase: CreateSubscriptionUseCase,
    private readonly getCurrentSubscriptionUseCase: GetCurrentSubscriptionUseCase,
    private readonly updateSubscriptionUseCase: UpdateSubscriptionUseCase,
    private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
  ) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Crear suscripción para la organización' })
  create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.createSubscriptionUseCase.execute(buildRlsContext(user, tenant), dto);
  }

  @Get('current')
  @ApiOperation({ summary: 'Obtener suscripción activa de la organización' })
  getCurrent(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext) {
    return this.getCurrentSubscriptionUseCase.execute(buildRlsContext(user, tenant));
  }

  @Patch('current')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Actualizar suscripción de la organización' })
  update(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.updateSubscriptionUseCase.execute(buildRlsContext(user, tenant), dto);
  }

  @Patch('current/cancel')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Dar de baja la suscripción de la organización' })
  cancel(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext) {
    return this.cancelSubscriptionUseCase.execute(buildRlsContext(user, tenant));
  }
}
