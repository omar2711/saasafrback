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
import { CreateKitUseCase } from '../application/usecases/create-kit.usecase';
import { DeleteKitUseCase } from '../application/usecases/delete-kit.usecase';
import { GetKitUseCase } from '../application/usecases/get-kit.usecase';
import { ListKitsUseCase } from '../application/usecases/list-kits.usecase';
import { UpdateKitUseCase } from '../application/usecases/update-kit.usecase';
import { CreateKitDto } from './dto/create-kit.dto';
import { UpdateKitDto } from './dto/update-kit.dto';

@ApiTags('Operations / Kits')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organizacion', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('operations/kits')
export class KitsController {
  constructor(
    private readonly createKitUseCase: CreateKitUseCase,
    private readonly listKitsUseCase: ListKitsUseCase,
    private readonly getKitUseCase: GetKitUseCase,
    private readonly updateKitUseCase: UpdateKitUseCase,
    private readonly deleteKitUseCase: DeleteKitUseCase,
  ) {}

  @Post()
  @Permissions('kits.write')
  @ApiOperation({ summary: 'Crear kit (combo de productos)' })
  create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateKitDto,
  ) {
    return this.createKitUseCase.execute(buildRlsContext(user, tenant), dto);
  }

  @Get()
  @Permissions('products.read')
  @ApiOperation({ summary: 'Listar kits' })
  list(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext) {
    return this.listKitsUseCase.execute(buildRlsContext(user, tenant));
  }

  @Get(':id')
  @Permissions('products.read')
  @ApiOperation({ summary: 'Obtener kit' })
  get(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.getKitUseCase.execute(buildRlsContext(user, tenant), id);
  }

  @Patch(':id')
  @Permissions('kits.write')
  @ApiOperation({ summary: 'Actualizar kit' })
  update(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateKitDto,
  ) {
    return this.updateKitUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }

  @Delete(':id')
  @Permissions('kits.write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar kit (soft delete)' })
  delete(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.deleteKitUseCase.execute(buildRlsContext(user, tenant), id);
  }
}
