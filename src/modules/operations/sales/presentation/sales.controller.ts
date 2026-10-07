import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Tenant } from '../../../../common/decorators/tenant.decorator';
import type { JwtUser } from '../../../../common/auth/jwt-user';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../../../common/guards/permissions.guard';
import { Permissions } from '../../../../common/decorators/permissions.decorator';
import {
  UserPermissions,
  type GrantedPermissions,
} from '../../../../common/decorators/user-permissions.decorator';
import { buildRlsContext } from '../../../../common/tenant/rls-context';
import type { TenantContext } from '../../../../common/tenant/tenant-context';
import { AddPaymentUseCase } from '../application/usecases/add-payment.usecase';
import { CreateInvoiceUseCase } from '../application/usecases/create-invoice.usecase';
import { CreateSaleUseCase } from '../application/usecases/create-sale.usecase';
import { DeliverSaleUseCase } from '../application/usecases/deliver-sale.usecase';
import { GetSaleUseCase } from '../application/usecases/get-sale.usecase';
import { ListSalesUseCase } from '../application/usecases/list-sales.usecase';
import { UpdateSaleUseCase } from '../application/usecases/update-sale.usecase';
import { VoidSaleUseCase } from '../application/usecases/void-sale.usecase';
import { AddPaymentDto } from './dto/add-payment.dto';
import { DeliverSaleDto } from './dto/deliver-sale.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListSalesDto } from './dto/list-sales.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@ApiTags('Operations / Sales')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organizacion', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('operations/sales')
export class SalesController {
  constructor(
    private readonly createSaleUseCase: CreateSaleUseCase,
    private readonly listSalesUseCase: ListSalesUseCase,
    private readonly getSaleUseCase: GetSaleUseCase,
    private readonly updateSaleUseCase: UpdateSaleUseCase,
    private readonly voidSaleUseCase: VoidSaleUseCase,
    private readonly deliverSaleUseCase: DeliverSaleUseCase,
    private readonly addPaymentUseCase: AddPaymentUseCase,
    private readonly createInvoiceUseCase: CreateInvoiceUseCase,
  ) {}

  @Post()
  @Permissions('sales.write')
  @ApiOperation({ summary: 'Crear venta' })
  create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @UserPermissions() granted: GrantedPermissions,
    @Body() dto: CreateSaleDto,
  ) {
    return this.createSaleUseCase.execute(
      buildRlsContext(user, tenant),
      user.sub,
      dto,
      // Vender fuera del rango autorizado no es un permiso de la ruta: la venta
      // normal sigue permitida, solo se afloja el limite de precio.
      granted.has('sales.price_override'),
    );
  }

  @Get()
  @Permissions('sales.read')
  @ApiOperation({ summary: 'Listar ventas' })
  list(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Query() query: ListSalesDto,
  ) {
    return this.listSalesUseCase.execute(buildRlsContext(user, tenant), query);
  }

  @Get(':id')
  @Permissions('sales.read')
  @ApiOperation({ summary: 'Obtener venta' })
  get(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.getSaleUseCase.execute(buildRlsContext(user, tenant), id);
  }

  @Patch(':id')
  @Permissions('sales.write')
  @ApiOperation({ summary: 'Actualizar venta' })
  update(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSaleDto,
  ) {
    return this.updateSaleUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }

  @Post(':id/void')
  @Permissions('sales.void')
  @ApiOperation({ summary: 'Anular venta (repone stock)' })
  void(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.voidSaleUseCase.execute(buildRlsContext(user, tenant), id);
  }

  @Post(':id/deliver')
  @Permissions('sales.deliver')
  @ApiOperation({
    summary: 'Entregar venta con entrega pendiente (descuenta stock diferido y cobra el saldo)',
  })
  deliver(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DeliverSaleDto,
  ) {
    return this.deliverSaleUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }

  @Post(':id/payments')
  @Permissions('sales.write')
  @ApiOperation({ summary: 'Registrar pago' })
  addPayment(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddPaymentDto,
  ) {
    return this.addPaymentUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }

  @Post(':id/invoice')
  @Permissions('sales.write')
  @ApiOperation({ summary: 'Emitir factura' })
  createInvoice(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.createInvoiceUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }
}
