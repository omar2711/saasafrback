import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { CreateUserUseCase } from '../application/usecases/create-user.usecase';
import { GetUserUseCase } from '../application/usecases/get-user.usecase';
import { ListUsersUseCase } from '../application/usecases/list-users.usecase';
import { SetUserStatusUseCase } from '../application/usecases/set-user-status.usecase';
import { UpdateUserUseCase } from '../application/usecases/update-user.usecase';
import { CreateUserDto } from './dto/create-user.dto';
import { SetUserStatusDto } from './dto/set-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('IAM / Users')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organización', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('iam/users')
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly setUserStatusUseCase: SetUserStatusUseCase,
  ) {}

  @Post()
  @Permissions('users.write')
  @ApiOperation({ summary: 'Crear usuario' })
  create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateUserDto,
  ) {
    return this.createUserUseCase.execute(buildRlsContext(user, tenant), dto);
  }

  @Get()
  @Permissions('users.read')
  @ApiOperation({ summary: 'Listar usuarios de la organización' })
  list(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext) {
    return this.listUsersUseCase.execute(buildRlsContext(user, tenant));
  }

  @Get(':id')
  @Permissions('users.read')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  get(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.getUserUseCase.execute(buildRlsContext(user, tenant), id);
  }

  @Patch(':id')
  @Permissions('users.write')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.updateUserUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }

  @Patch(':id/status')
  @Permissions('users.write')
  @ApiOperation({ summary: 'Cambiar estado del usuario' })
  setStatus(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: SetUserStatusDto,
  ) {
    return this.setUserStatusUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }
}
