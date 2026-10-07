import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { AssignRolePermissionUseCase } from '../application/usecases/assign-role-permission.usecase';
import { CreateRoleUseCase } from '../application/usecases/create-role.usecase';
import { DeleteRoleUseCase } from '../application/usecases/delete-role.usecase';
import { ListRolesUseCase } from '../application/usecases/list-roles.usecase';
import { RemoveRolePermissionUseCase } from '../application/usecases/remove-role-permission.usecase';
import { UpdateRoleUseCase } from '../application/usecases/update-role.usecase';
import { AssignRolePermissionDto } from './dto/assign-role-permission.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('IAM / Roles')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organización', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('iam/roles')
export class RolesController {
  constructor(
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly listRolesUseCase: ListRolesUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly assignRolePermissionUseCase: AssignRolePermissionUseCase,
    private readonly removeRolePermissionUseCase: RemoveRolePermissionUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
  ) {}

  @Post()
  @Permissions('roles.manage')
  @ApiOperation({ summary: 'Crear rol' })
  create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateRoleDto,
  ) {
    return this.createRoleUseCase.execute(buildRlsContext(user, tenant), dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar roles de la organización' })
  list(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext) {
    return this.listRolesUseCase.execute(buildRlsContext(user, tenant));
  }

  @Patch(':id')
  @Permissions('roles.manage')
  @ApiOperation({ summary: 'Actualizar rol' })
  update(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.updateRoleUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }

  @Delete(':id')
  @Permissions('roles.manage')
  @ApiOperation({ summary: 'Eliminar rol (no permite roles del sistema)' })
  remove(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
  ) {
    return this.deleteRoleUseCase.execute(buildRlsContext(user, tenant), id);
  }

  @Post(':id/permissions')
  @Permissions('roles.manage')
  @ApiOperation({ summary: 'Asignar permiso a rol' })
  assignPermission(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: AssignRolePermissionDto,
  ) {
    return this.assignRolePermissionUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }

  @Delete(':id/permissions/:permissionId')
  @Permissions('roles.manage')
  @ApiOperation({ summary: 'Quitar permiso de rol' })
  removePermission(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.removeRolePermissionUseCase.execute(
      buildRlsContext(user, tenant),
      id,
      permissionId,
    );
  }
}
