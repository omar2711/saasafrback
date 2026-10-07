import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/auth/jwt-user';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminService } from './admin.service';
import {
  AdminFilterDto,
  AdminOrganizationDto,
  AdminPaymentDto,
  AdminPlanDto,
  AdminUserDto,
  LegalDocumentDto,
  PaymentStatusDto,
} from './admin.dto';
import { Matches } from 'class-validator';
import { UUID_PATTERN } from '../../common/utils/uuid';
class IdParam {
  @Matches(UUID_PATTERN) id: string;
}
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly service: AdminService) {}
  @Get('dashboard') dashboard(
    @CurrentUser() u: JwtUser,
    @Query() f: AdminFilterDto,
  ) {
    return this.service.dashboard(u, f);
  }
  @Get('organizations') organizations(
    @CurrentUser() u: JwtUser,
    @Query() f: AdminFilterDto,
  ) {
    return this.service.organizations(u, f);
  }
  @Post('organizations') createOrganization(
    @CurrentUser() u: JwtUser,
    @Body() d: AdminOrganizationDto,
  ) {
    return this.service.saveOrganization(u, d);
  }
  @Patch('organizations/:id') updateOrganization(
    @CurrentUser() u: JwtUser,
    @Param() p: IdParam,
    @Body() d: AdminOrganizationDto,
  ) {
    return this.service.saveOrganization(u, d, p.id);
  }
  @Get('plans') plans(@CurrentUser() u: JwtUser) {
    return this.service.plans(u);
  }
  @Post('plans') createPlan(
    @CurrentUser() u: JwtUser,
    @Body() d: AdminPlanDto,
  ) {
    return this.service.savePlan(u, d);
  }
  @Patch('plans/:id') updatePlan(
    @CurrentUser() u: JwtUser,
    @Param() p: IdParam,
    @Body() d: AdminPlanDto,
  ) {
    return this.service.savePlan(u, d, p.id);
  }
  @Get('users') users(@CurrentUser() u: JwtUser) {
    return this.service.users(u);
  }
  @Post('users') createUser(
    @CurrentUser() u: JwtUser,
    @Body() d: AdminUserDto,
  ) {
    return this.service.saveUser(u, d);
  }
  @Patch('users/:id') updateUser(
    @CurrentUser() u: JwtUser,
    @Param() p: IdParam,
    @Body() d: AdminUserDto,
  ) {
    return this.service.saveUser(u, d, p.id);
  }
  @Get('finance') finance(
    @CurrentUser() u: JwtUser,
    @Query() f: AdminFilterDto,
  ) {
    return this.service.finance(u, f);
  }
  @Post('finance') createPayment(
    @CurrentUser() u: JwtUser,
    @Body() d: AdminPaymentDto,
  ) {
    return this.service.createPayment(u, d);
  }
  @Patch('finance/:id') paymentStatus(
    @CurrentUser() u: JwtUser,
    @Param() p: IdParam,
    @Body() d: PaymentStatusDto,
  ) {
    return this.service.updatePayment(u, p.id, d);
  }
  @Get('audit') audit(@CurrentUser() u: JwtUser, @Query() f: AdminFilterDto) {
    return this.service.audit(u, f);
  }
  @Get('legal') legal(@CurrentUser() u: JwtUser) {
    return this.service.legalDocuments(u);
  }
  @Post('legal') saveLegal(
    @CurrentUser() u: JwtUser,
    @Body() d: LegalDocumentDto,
  ) {
    return this.service.saveLegal(u, d);
  }
}
@Controller('legal')
export class LegalController {
  constructor(private readonly service: AdminService) {}
  @Get(':kind') get(@Param('kind') kind: string) {
    return this.service.publicLegal(kind);
  }
  @Post(':id/accept') @UseGuards(JwtAuthGuard) accept(
    @CurrentUser() u: JwtUser,
    @Param() p: IdParam,
  ) {
    return this.service.acceptLegal(u, p.id);
  }
}
