import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { CreateCustomerUseCase } from '../application/usecases/create-customer.usecase';
import { DeleteCustomerUseCase } from '../application/usecases/delete-customer.usecase';
import { GetCustomerUseCase } from '../application/usecases/get-customer.usecase';
import { GetCustomerHistoryUseCase } from '../application/usecases/get-customer-history.usecase';
import { ListCustomersUseCase } from '../application/usecases/list-customers.usecase';
import { UpdateCustomerUseCase } from '../application/usecases/update-customer.usecase';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('Operations / Customers')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organizacion', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('operations/customers')
export class CustomersController {
  constructor(
    private readonly createCustomerUseCase: CreateCustomerUseCase,
    private readonly listCustomersUseCase: ListCustomersUseCase,
    private readonly getCustomerUseCase: GetCustomerUseCase,
    private readonly getCustomerHistoryUseCase: GetCustomerHistoryUseCase,
    private readonly updateCustomerUseCase: UpdateCustomerUseCase,
    private readonly deleteCustomerUseCase: DeleteCustomerUseCase,
  ) {}

  @Post()
  @Permissions('customers.write')
  @ApiOperation({ summary: 'Crear cliente' })
  create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.createCustomerUseCase.execute(buildRlsContext(user, tenant), dto);
  }

  @Get()
  @Permissions('customers.read')
  @ApiOperation({ summary: 'Listar clientes' })
  list(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext) {
    return this.listCustomersUseCase.execute(buildRlsContext(user, tenant));
  }

  @Get(':id/history')
  @Permissions('customers.read')
  @ApiOperation({ summary: 'Historial de compras y cotizaciones del cliente' })
  history(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.getCustomerHistoryUseCase.execute(buildRlsContext(user, tenant), id);
  }

  @Get(':id')
  @Permissions('customers.read')
  @ApiOperation({ summary: 'Obtener cliente' })
  get(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.getCustomerUseCase.execute(buildRlsContext(user, tenant), id);
  }

  @Patch(':id')
  @Permissions('customers.write')
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.updateCustomerUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }

  @Delete(':id')
  @Permissions('customers.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar cliente (soft delete)' })
  delete(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.deleteCustomerUseCase.execute(buildRlsContext(user, tenant), id);
  }
}
