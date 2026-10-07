import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Tenant } from '../../../../common/decorators/tenant.decorator';
import type { JwtUser } from '../../../../common/auth/jwt-user';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../../../common/guards/permissions.guard';
import { Permissions } from '../../../../common/decorators/permissions.decorator';
import { buildRlsContext } from '../../../../common/tenant/rls-context';
import type { TenantContext } from '../../../../common/tenant/tenant-context';
import { CreatePettyCashTransactionUseCase } from '../application/usecases/create-petty-cash-transaction.usecase';
import { ListPettyCashTransactionsUseCase } from '../application/usecases/list-petty-cash-transactions.usecase';
import { DeletePettyCashTransactionUseCase } from '../application/usecases/delete-petty-cash-transaction.usecase';
import { CreatePettyCashTransactionDto } from './dto/create-petty-cash-transaction.dto';

@ApiTags('Operations / Petty Cash')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organizacion', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('operations/petty-cash')
export class PettyCashController {
  constructor(
    private readonly createTransactionUseCase: CreatePettyCashTransactionUseCase,
    private readonly listTransactionsUseCase: ListPettyCashTransactionsUseCase,
    private readonly deleteTransactionUseCase: DeletePettyCashTransactionUseCase,
  ) {}

  @Post()
  @Permissions('petty_cash.write')
  @ApiOperation({ summary: 'Registrar movimiento de caja chica' })
  create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreatePettyCashTransactionDto,
  ) {
    return this.createTransactionUseCase.execute(buildRlsContext(user, tenant), user.sub, dto);
  }

  @Get()
  @Permissions('petty_cash.read')
  @ApiOperation({ summary: 'Listar movimientos de caja chica con resumen' })
  list(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Query('branchId') branchId?: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
  ) {
    return this.listTransactionsUseCase.execute(buildRlsContext(user, tenant), {
      branchId,
      type,
      category,
    });
  }

  @Delete(':id')
  @Permissions('petty_cash.write')
  @HttpCode(204)
  @ApiOperation({ summary: 'Eliminar movimiento de caja chica (soft delete)' })
  async remove(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    await this.deleteTransactionUseCase.execute(buildRlsContext(user, tenant), id);
  }
}
