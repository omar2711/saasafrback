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
import { InviteMemberUseCase } from '../application/usecases/invite-member.usecase';
import { ListMembershipsUseCase } from '../application/usecases/list-memberships.usecase';
import { UpdateMembershipUseCase } from '../application/usecases/update-membership.usecase';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';

@ApiTags('IAM / Memberships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('iam/memberships')
export class MembershipsController {
  constructor(
    private readonly inviteMemberUseCase: InviteMemberUseCase,
    private readonly listMembershipsUseCase: ListMembershipsUseCase,
    private readonly updateMembershipUseCase: UpdateMembershipUseCase,
  ) {}

  @Post('invite')
  @UseGuards(TenantGuard, PermissionsGuard)
  @Permissions('users.write')
  @ApiHeader({ name: 'x-tenant-id', description: 'ID de la organización', required: true })
  @ApiOperation({ summary: 'Invitar miembro a la organización' })
  invite(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: InviteMemberDto,
  ) {
    return this.inviteMemberUseCase.execute(buildRlsContext(user, tenant), dto);
  }

  @Get()
  @UseGuards(TenantGuard, PermissionsGuard)
  @Permissions('users.read')
  @ApiHeader({ name: 'x-tenant-id', description: 'ID de la organización', required: true })
  @ApiOperation({ summary: 'Listar miembros de la organización' })
  listByOrg(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext) {
    return this.listMembershipsUseCase.listByOrg(buildRlsContext(user, tenant));
  }

  @Get('me')
  @ApiOperation({ summary: 'Listar organizaciones del usuario autenticado' })
  listByUser(@CurrentUser() user?: JwtUser) {
    if (!user) {
      return [];
    }

    return this.listMembershipsUseCase.listByUser(buildRlsContext(user));
  }

  @Patch(':id')
  @UseGuards(TenantGuard, PermissionsGuard)
  @Permissions('users.write')
  @ApiHeader({ name: 'x-tenant-id', description: 'ID de la organización', required: true })
  @ApiOperation({ summary: 'Actualizar membresía' })
  update(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateMembershipDto,
  ) {
    return this.updateMembershipUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }
}
