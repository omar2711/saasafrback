import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query, UseGuards } from '@nestjs/common';
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
import { ListBranchPricesUseCase } from '../application/usecases/list-branch-prices.usecase';
import { ListProductBranchPricesUseCase } from '../application/usecases/list-product-branch-prices.usecase';
import { UpsertBranchPriceUseCase } from '../application/usecases/upsert-branch-price.usecase';
import { ListBranchPricesDto } from './dto/list-branch-prices.dto';
import { UpsertBranchPriceDto } from './dto/upsert-branch-price.dto';

@ApiTags('Operations / Pricing')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organizacion', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('operations/pricing')
export class PricingController {
  constructor(
    private readonly listBranchPricesUseCase: ListBranchPricesUseCase,
    private readonly listProductBranchPricesUseCase: ListProductBranchPricesUseCase,
    private readonly upsertBranchPriceUseCase: UpsertBranchPriceUseCase,
  ) {}

  @Get()
  @Permissions('products.read')
  @ApiOperation({ summary: 'Listar precios efectivos de productos para una sucursal' })
  listByBranch(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Query() query: ListBranchPricesDto,
  ) {
    return this.listBranchPricesUseCase.execute(buildRlsContext(user, tenant), query);
  }

  @Get('product/:id')
  @Permissions('products.read')
  @ApiOperation({ summary: 'Listar precios de un producto en todas las sucursales' })
  listForProduct(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.listProductBranchPricesUseCase.execute(buildRlsContext(user, tenant), id);
  }

  @Put()
  @Permissions('products.pricing')
  @ApiOperation({ summary: 'Crear/actualizar precio de un producto en una sucursal' })
  upsert(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: UpsertBranchPriceDto,
  ) {
    return this.upsertBranchPriceUseCase.execute(buildRlsContext(user, tenant), dto);
  }
}
