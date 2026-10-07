import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { DatabaseModule } from '../../database/database.module';
import { AdminController, LegalController } from './admin.controller';
import { AdminService } from './admin.service';
@Module({
  imports: [CommonModule, DatabaseModule],
  controllers: [AdminController, LegalController],
  providers: [AdminService],
})
export class AdminModule {}
