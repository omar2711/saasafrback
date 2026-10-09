import { Module } from '@nestjs/common';
import { CommonModule } from '../../../common/common.module';
import { DatabaseModule } from '../../../database/database.module';
import { ReportsController } from './reports.controller';
@Module({ imports: [CommonModule, DatabaseModule], controllers: [ReportsController] })
export class ReportsModule {}
