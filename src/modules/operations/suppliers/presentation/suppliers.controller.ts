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
import { CreateSupplierUseCase } from '../application/usecases/create-supplier.usecase';
import { DeleteSupplierUseCase } from '../application/usecases/delete-supplier.usecase';
import { ListSuppliersUseCase } from '../application/usecases/list-suppliers.usecase';
import { UpdateSupplierUseCase } from '../application/usecases/update-supplier.usecase';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@ApiTags('Operations / Suppliers')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organizacion', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('operations/suppliers')
export class SuppliersController {
  constructor(
    private readonly createSupplierUseCase: CreateSupplierUseCase,
    private readonly listSuppliersUseCase: ListSuppliersUseCase,
    private readonly updateSupplierUseCase: UpdateSupplierUseCase,
    private readonly deleteSupplierUseCase: DeleteSupplierUseCase,
  ) {}

  @Post()
  @Permissions('suppliers.write')
  @ApiOperation({ summary: 'Crear proveedor' })
  create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.createSupplierUseCase.execute(buildRlsContext(user, tenant), dto);
  }

  @Get()
  @Permissions('suppliers.read')
  @ApiOperation({ summary: 'Listar proveedores' })
  list(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext) {
    return this.listSuppliersUseCase.execute(buildRlsContext(user, tenant));
  }

  @Patch(':id')
  @Permissions('suppliers.write')
  @ApiOperation({ summary: 'Actualizar proveedor' })
  update(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.updateSupplierUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }

  @Delete(':id')
  @Permissions('suppliers.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar proveedor (soft delete)' })
  delete(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.deleteSupplierUseCase.execute(buildRlsContext(user, tenant), id);
  }
}
