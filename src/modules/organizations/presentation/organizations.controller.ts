import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Tenant } from '../../../common/decorators/tenant.decorator';
import type { JwtUser } from '../../../common/auth/jwt-user';
import type { TenantContext } from '../../../common/tenant/tenant-context';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { buildRlsContext } from '../../../common/tenant/rls-context';
import { CreateOrganizationUseCase } from '../application/usecases/create-organization.usecase';
import { GetMyBranchUseCase } from '../application/usecases/get-my-branch.usecase';
import { GetOrganizationUseCase } from '../application/usecases/get-organization.usecase';
import { ListOrganizationsUseCase } from '../application/usecases/list-organizations.usecase';
import { UpdateOrganizationUseCase } from '../application/usecases/update-organization.usecase';
import { GetWorkScheduleUseCase } from '../application/usecases/get-work-schedule.usecase';
import { UpdateWorkScheduleUseCase } from '../application/usecases/update-work-schedule.usecase';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { UpdateWorkScheduleDto } from './dto/update-work-schedule.dto';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly listOrganizationsUseCase: ListOrganizationsUseCase,
    private readonly getOrganizationUseCase: GetOrganizationUseCase,
    private readonly updateOrganizationUseCase: UpdateOrganizationUseCase,
    private readonly getMyBranchUseCase: GetMyBranchUseCase,
    private readonly getWorkScheduleUseCase: GetWorkScheduleUseCase,
    private readonly updateWorkScheduleUseCase: UpdateWorkScheduleUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear organización' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateOrganizationDto) {
    return this.createOrganizationUseCase.execute(buildRlsContext(user), dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar organizaciones del usuario' })
  list(@CurrentUser() user: JwtUser) {
    return this.listOrganizationsUseCase.execute(buildRlsContext(user));
  }

  @Get('permissions')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiHeader({ name: 'x-tenant-id', description: 'ID de la organización', required: true })
  @ApiOperation({ summary: 'Permisos del usuario, features del plan y sucursal asignada' })
  async myPermissions(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Req() req: Request & { permissions?: string[]; planFeatures?: string[] },
  ) {
    const { assignedBranchId } = await this.getMyBranchUseCase.execute(
      buildRlsContext(user, tenant),
    );
    return {
      permissions: req.permissions ?? [],
      planFeatures: req.planFeatures ?? [],
      assignedBranchId,
    };
  }

  @Get('work-schedule')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @ApiHeader({ name: 'x-tenant-id', description: 'ID de la organización', required: true })
  @ApiOperation({ summary: 'Horario laboral de la organización' })
  getWorkSchedule(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext) {
    return this.getWorkScheduleUseCase.execute(buildRlsContext(user, tenant));
  }

  @Patch('work-schedule')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('settings.schedule')
  @ApiHeader({ name: 'x-tenant-id', description: 'ID de la organización', required: true })
  @ApiOperation({ summary: 'Configurar el horario laboral' })
  updateWorkSchedule(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: UpdateWorkScheduleDto,
  ) {
    return this.updateWorkScheduleUseCase.execute(buildRlsContext(user, tenant), dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener organización por ID' })
  get(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.getOrganizationUseCase.execute(buildRlsContext(user), id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
  @Permissions('settings.write')
  @ApiHeader({ name: 'x-tenant-id', description: 'ID de la organización', required: true })
  @ApiOperation({ summary: 'Actualizar organización' })
  update(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.updateOrganizationUseCase.execute(buildRlsContext(user), id, dto);
  }
}
