import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DatabaseModule } from '../database/database.module';
import { AuditService } from './audit/audit.service';
import { WorkScheduleService } from './schedule/work-schedule.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalTenantGuard } from './guards/optional-tenant.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { TenantGuard } from './guards/tenant.guard';

@Module({
  imports: [DatabaseModule, JwtModule.register({})],
  providers: [
    JwtAuthGuard,
    TenantGuard,
    OptionalTenantGuard,
    PermissionsGuard,
    SuperAdminGuard,
    AuditService,
    WorkScheduleService,
  ],
  exports: [
    JwtAuthGuard,
    TenantGuard,
    OptionalTenantGuard,
    PermissionsGuard,
    SuperAdminGuard,
    AuditService,
    WorkScheduleService,
    JwtModule,
  ],
})
export class CommonModule {}
