import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { DatabaseModule } from '../../database/database.module';
import { GetAuditSummaryUseCase } from './application/usecases/get-audit-summary.usecase';
import { ListAuditLogsUseCase } from './application/usecases/list-audit-logs.usecase';
import { AuditController } from './presentation/audit.controller';

@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [AuditController],
  providers: [ListAuditLogsUseCase, GetAuditSummaryUseCase],
})
export class AuditModule {}
