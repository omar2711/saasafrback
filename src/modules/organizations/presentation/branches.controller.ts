import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Tenant } from '../../../common/decorators/tenant.decorator';
import type { JwtUser } from '../../../common/auth/jwt-user';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { buildRlsContext } from '../../../common/tenant/rls-context';
import type { TenantContext } from '../../../common/tenant/tenant-context';
import { CreateBranchUseCase } from '../application/usecases/create-branch.usecase';
import { ListBranchesUseCase } from '../application/usecases/list-branches.usecase';
import { UpdateBranchUseCase } from '../application/usecases/update-branch.usecase';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@ApiTags('Organizations / Branches')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organización', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('organizations/branches')
export class BranchesController {
  constructor(
    private readonly createBranchUseCase: CreateBranchUseCase,
    private readonly listBranchesUseCase: ListBranchesUseCase,
    private readonly updateBranchUseCase: UpdateBranchUseCase,
  ) {}

  @Post()
  @Permissions('settings.write')
  @ApiOperation({ summary: 'Crear sucursal' })
  create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateBranchDto,
  ) {
    return this.createBranchUseCase.execute(buildRlsContext(user, tenant), dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar sucursales de la organización' })
  list(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext) {
    return this.listBranchesUseCase.execute(buildRlsContext(user, tenant));
  }

  @Patch(':id')
  @Permissions('settings.write')
  @ApiOperation({ summary: 'Actualizar sucursal' })
  update(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.updateBranchUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }
}
