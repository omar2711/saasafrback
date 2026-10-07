import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Tenant } from '../../../common/decorators/tenant.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import type { JwtUser } from '../../../common/auth/jwt-user';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { buildRlsContext } from '../../../common/tenant/rls-context';
import type { TenantContext } from '../../../common/tenant/tenant-context';
import { GetAuditSummaryUseCase } from '../application/usecases/get-audit-summary.usecase';
import { ListAuditLogsUseCase } from '../application/usecases/list-audit-logs.usecase';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

@ApiTags('Audit')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organizacion', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('audit')
export class AuditController {
  constructor(
    private readonly listAuditLogsUseCase: ListAuditLogsUseCase,
    private readonly getAuditSummaryUseCase: GetAuditSummaryUseCase,
  ) {}

  @Get()
  @Permissions('audit.read')
  @ApiOperation({ summary: 'Listar eventos de auditoria' })
  list(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Query() query: ListAuditLogsDto,
  ) {
    return this.listAuditLogsUseCase.execute(buildRlsContext(user, tenant), query);
  }

  @Get('summary')
  @Permissions('audit.read')
  @ApiOperation({ summary: 'Totales para las tarjetas de la pantalla de Auditoria' })
  summary(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext) {
    return this.getAuditSummaryUseCase.execute(buildRlsContext(user, tenant));
  }
}
