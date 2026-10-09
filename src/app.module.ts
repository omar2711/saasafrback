import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './modules/admin/admin.module';
import { TenantMiddleware } from './common/tenant/tenant.middleware';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { IamModule } from './modules/iam/iam.module';
import { OperationsModule } from './modules/operations/operations.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { SupportModule } from './modules/support/support.module';
import { PrivateCacheModule } from './common/cache/private-cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    PrivateCacheModule,
    AdminModule,
    AuthModule,
    AuditModule,
    IamModule,
    OrganizationsModule,
    BillingModule,
    OperationsModule,
    SupportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
