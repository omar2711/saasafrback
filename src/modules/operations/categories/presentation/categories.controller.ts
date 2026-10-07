import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { CreateProductCategoryUseCase } from '../application/usecases/create-product-category.usecase';
import { DeleteProductCategoryUseCase } from '../application/usecases/delete-product-category.usecase';
import { ListProductCategoriesUseCase } from '../application/usecases/list-product-categories.usecase';
import { UpdateProductCategoryUseCase } from '../application/usecases/update-product-category.usecase';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { ListProductCategoriesDto } from './dto/list-product-categories.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@ApiTags('Operations / Categories')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organizacion', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('operations/categories')
export class CategoriesController {
  constructor(
    private readonly listUseCase: ListProductCategoriesUseCase,
    private readonly createUseCase: CreateProductCategoryUseCase,
    private readonly updateUseCase: UpdateProductCategoryUseCase,
    private readonly deleteUseCase: DeleteProductCategoryUseCase,
  ) {}

  @Get()
  @Permissions('products.read')
  @ApiOperation({ summary: 'Listar categorias (con conteo por sucursal)' })
  list(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Query() query: ListProductCategoriesDto,
  ) {
    return this.listUseCase.execute(buildRlsContext(user, tenant), query);
  }

  @Post()
  @Permissions('categories.write')
  @ApiOperation({ summary: 'Crear categoria' })
  create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateProductCategoryDto,
  ) {
    return this.createUseCase.execute(buildRlsContext(user, tenant), dto);
  }

  @Patch(':id')
  @Permissions('categories.write')
  @ApiOperation({ summary: 'Actualizar categoria' })
  update(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateProductCategoryDto,
  ) {
    return this.updateUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }

  @Delete(':id')
  @Permissions('categories.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar categoria (soft delete)' })
  delete(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.deleteUseCase.execute(buildRlsContext(user, tenant), id);
  }
}
