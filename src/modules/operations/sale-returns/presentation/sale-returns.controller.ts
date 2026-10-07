import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Tenant } from '../../../../common/decorators/tenant.decorator';
import type { JwtUser } from '../../../../common/auth/jwt-user';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../../../common/guards/permissions.guard';
import { Permissions } from '../../../../common/decorators/permissions.decorator';
import { buildRlsContext } from '../../../../common/tenant/rls-context';
import type { TenantContext } from '../../../../common/tenant/tenant-context';
import { CreateSaleReturnUseCase } from '../application/usecases/create-sale-return.usecase';
import { GetSaleReturnUseCase } from '../application/usecases/get-sale-return.usecase';
import { ListSaleReturnsUseCase } from '../application/usecases/list-sale-returns.usecase';
import { VoidSaleReturnUseCase } from '../application/usecases/void-sale-return.usecase';
import { CreateSaleReturnDto } from './dto/create-sale-return.dto';
import { ListSaleReturnsDto } from './dto/list-sale-returns.dto';

@ApiTags('Operations / Sale Returns')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organizacion', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('operations/sale-returns')
export class SaleReturnsController {
  constructor(
    private readonly createSaleReturnUseCase: CreateSaleReturnUseCase,
    private readonly listSaleReturnsUseCase: ListSaleReturnsUseCase,
    private readonly getSaleReturnUseCase: GetSaleReturnUseCase,
    private readonly voidSaleReturnUseCase: VoidSaleReturnUseCase,
  ) {}

  @Post()
  @Permissions('sales.return')
  @ApiOperation({ summary: 'Registrar devolucion parcial de una venta' })
  create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateSaleReturnDto,
  ) {
    return this.createSaleReturnUseCase.execute(buildRlsContext(user, tenant), dto);
  }

  @Get()
  @Permissions('sales.read')
  @ApiOperation({ summary: 'Listar devoluciones' })
  list(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Query() query: ListSaleReturnsDto,
  ) {
    return this.listSaleReturnsUseCase.execute(buildRlsContext(user, tenant), query);
  }

  @Get(':id')
  @Permissions('sales.read')
  @ApiOperation({ summary: 'Obtener devolucion' })
  get(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.getSaleReturnUseCase.execute(buildRlsContext(user, tenant), id);
  }

  @Post(':id/void')
  @Permissions('sales.return')
  @ApiOperation({ summary: 'Anular devolucion (revierte el stock repuesto)' })
  void(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.voidSaleReturnUseCase.execute(buildRlsContext(user, tenant), id);
  }
}
