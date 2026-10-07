import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../../../common/auth/jwt-user';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../../common/guards/super-admin.guard';
import { buildRlsContext } from '../../../../common/tenant/rls-context';
import { CreatePlanUseCase } from '../application/usecases/create-plan.usecase';
import { ListPlansUseCase } from '../application/usecases/list-plans.usecase';
import { UpdatePlanUseCase } from '../application/usecases/update-plan.usecase';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@ApiTags('Billing / Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing/plans')
export class PlansController {
  constructor(
    private readonly createPlanUseCase: CreatePlanUseCase,
    private readonly listPlansUseCase: ListPlansUseCase,
    private readonly updatePlanUseCase: UpdatePlanUseCase,
  ) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Crear plan (super admin)' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreatePlanDto) {
    return this.createPlanUseCase.execute(buildRlsContext(user), dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar planes' })
  list(@CurrentUser() user: JwtUser) {
    return this.listPlansUseCase.execute(buildRlsContext(user));
  }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  @ApiOperation({ summary: 'Actualizar plan (super admin)' })
  update(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.updatePlanUseCase.execute(buildRlsContext(user), id, dto);
  }
}
