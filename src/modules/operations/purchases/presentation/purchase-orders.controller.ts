import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Tenant } from '../../../../common/decorators/tenant.decorator';
import type { JwtUser } from '../../../../common/auth/jwt-user';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../../../common/guards/permissions.guard';
import { Permissions } from '../../../../common/decorators/permissions.decorator';
import { buildRlsContext } from '../../../../common/tenant/rls-context';
import type { TenantContext } from '../../../../common/tenant/tenant-context';
import { CreatePurchaseOrderUseCase } from '../application/usecases/create-purchase-order.usecase';
import { GetPurchaseOrderUseCase } from '../application/usecases/get-purchase-order.usecase';
import { ListOpenPoLinesForProductUseCase } from '../application/usecases/list-open-po-lines-for-product.usecase';
import { ListPurchaseOrdersUseCase } from '../application/usecases/list-purchase-orders.usecase';
import { ReceivePurchaseOrderUseCase } from '../application/usecases/receive-purchase-order.usecase';
import { UpdatePurchaseOrderUseCase } from '../application/usecases/update-purchase-order.usecase';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { ListPurchaseOrdersDto } from './dto/list-purchase-orders.dto';
import { ProductAvailabilityDto } from './dto/product-availability.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@ApiTags('Operations / Purchases')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organizacion', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('operations/purchases/orders')
export class PurchaseOrdersController {
  constructor(
    private readonly createPurchaseOrderUseCase: CreatePurchaseOrderUseCase,
    private readonly listPurchaseOrdersUseCase: ListPurchaseOrdersUseCase,
    private readonly getPurchaseOrderUseCase: GetPurchaseOrderUseCase,
    private readonly updatePurchaseOrderUseCase: UpdatePurchaseOrderUseCase,
    private readonly receivePurchaseOrderUseCase: ReceivePurchaseOrderUseCase,
    private readonly listOpenPoLinesForProductUseCase: ListOpenPoLinesForProductUseCase,
  ) {}

  @Post()
  @Permissions('purchases.write')
  @ApiOperation({ summary: 'Crear orden de compra' })
  create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreatePurchaseOrderDto,
  ) {
    return this.createPurchaseOrderUseCase.execute(buildRlsContext(user, tenant), dto);
  }

  @Get()
  @Permissions('purchases.read')
  @ApiOperation({ summary: 'Listar ordenes de compra' })
  list(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Query() query: ListPurchaseOrdersDto,
  ) {
    return this.listPurchaseOrdersUseCase.execute(buildRlsContext(user, tenant), query);
  }

  @Get('product-availability')
  @Permissions('purchases.read')
  @ApiOperation({ summary: 'Ordenes de compra abiertas que reabastecen un producto, con cantidad disponible para reservar' })
  productAvailability(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Query() query: ProductAvailabilityDto,
  ) {
    return this.listOpenPoLinesForProductUseCase.execute(
      buildRlsContext(user, tenant),
      query.productId,
      query.branchId,
    );
  }

  @Get(':id')
  @Permissions('purchases.read')
  @ApiOperation({ summary: 'Obtener orden de compra' })
  get(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.getPurchaseOrderUseCase.execute(buildRlsContext(user, tenant), id);
  }

  @Patch(':id')
  @Permissions('purchases.write')
  @ApiOperation({ summary: 'Actualizar orden de compra' })
  update(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ) {
    return this.updatePurchaseOrderUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }

  @Post(':id/receive')
  @Permissions('purchases.write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recepcionar orden de compra y actualizar inventario' })
  receive(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.receivePurchaseOrderUseCase.execute(buildRlsContext(user, tenant), id);
  }
}
