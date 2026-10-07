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
import { CreateProductUseCase } from '../application/usecases/create-product.usecase';
import { DeleteProductUseCase } from '../application/usecases/delete-product.usecase';
import { ListDeletedProductsUseCase } from '../application/usecases/list-deleted-products.usecase';
import { ListProductsUseCase } from '../application/usecases/list-products.usecase';
import { RestoreProductUseCase } from '../application/usecases/restore-product.usecase';
import { UpdateProductUseCase } from '../application/usecases/update-product.usecase';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('Operations / Products')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organizacion', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('operations/products')
export class ProductsController {
  constructor(
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly listProductsUseCase: ListProductsUseCase,
    private readonly listDeletedProductsUseCase: ListDeletedProductsUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase,
    private readonly restoreProductUseCase: RestoreProductUseCase,
  ) {}

  @Post()
  @Permissions('products.write')
  @ApiOperation({ summary: 'Crear producto' })
  create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateProductDto,
  ) {
    return this.createProductUseCase.execute(buildRlsContext(user, tenant), dto);
  }

  @Get()
  @Permissions('products.read')
  @ApiOperation({ summary: 'Listar productos' })
  list(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext) {
    return this.listProductsUseCase.execute(buildRlsContext(user, tenant));
  }

  @Get('deleted')
  @Permissions('products.read')
  @ApiOperation({ summary: 'Listar productos eliminados (papelera)' })
  listDeleted(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext) {
    return this.listDeletedProductsUseCase.execute(buildRlsContext(user, tenant));
  }

  @Patch(':id')
  @Permissions('products.write')
  @ApiOperation({ summary: 'Actualizar producto' })
  update(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.updateProductUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }

  @Post(':id/restore')
  @Permissions('products.write')
  @ApiOperation({ summary: 'Restaurar producto eliminado' })
  restore(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.restoreProductUseCase.execute(buildRlsContext(user, tenant), id);
  }

  @Delete(':id')
  @Permissions('products.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar producto (soft delete)' })
  delete(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.deleteProductUseCase.execute(buildRlsContext(user, tenant), id);
  }
}
