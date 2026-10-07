import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { CreateStockTransferUseCase } from '../application/usecases/create-stock-transfer.usecase';
import { GetStockTransferUseCase } from '../application/usecases/get-stock-transfer.usecase';
import { ListStockTransfersUseCase } from '../application/usecases/list-stock-transfers.usecase';
import { ReceiveStockTransferUseCase } from '../application/usecases/receive-stock-transfer.usecase';
import { VoidStockTransferUseCase } from '../application/usecases/void-stock-transfer.usecase';
import { CreateStockTransferDto } from './dto/create-stock-transfer.dto';
import { ListStockTransfersDto } from './dto/list-stock-transfers.dto';

@ApiTags('Operations / Stock Transfers')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organizacion', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('operations/inventory/transfers')
export class TransfersController {
  constructor(
    private readonly createUseCase: CreateStockTransferUseCase,
    private readonly listUseCase: ListStockTransfersUseCase,
    private readonly getUseCase: GetStockTransferUseCase,
    private readonly receiveUseCase: ReceiveStockTransferUseCase,
    private readonly voidUseCase: VoidStockTransferUseCase,
  ) {}

  @Post()
  @Permissions('inventory.transfer')
  @ApiOperation({ summary: 'Crear traspaso entre sucursales' })
  create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateStockTransferDto,
  ) {
    return this.createUseCase.execute(buildRlsContext(user, tenant), dto);
  }

  @Get()
  @Permissions('inventory.read')
  @ApiOperation({ summary: 'Listar traspasos' })
  list(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Query() query: ListStockTransfersDto,
  ) {
    return this.listUseCase.execute(buildRlsContext(user, tenant), query);
  }

  @Get(':id')
  @Permissions('inventory.read')
  @ApiOperation({ summary: 'Obtener traspaso' })
  get(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.getUseCase.execute(buildRlsContext(user, tenant), id);
  }

  @Post(':id/receive')
  @Permissions('inventory.transfer')
  @ApiOperation({ summary: 'Recibir traspaso (suma stock al destino)' })
  receive(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.receiveUseCase.execute(buildRlsContext(user, tenant), id);
  }

  @Post(':id/void')
  @Permissions('inventory.transfer')
  @ApiOperation({ summary: 'Anular traspaso (devuelve stock al origen)' })
  void(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.voidUseCase.execute(buildRlsContext(user, tenant), id);
  }
}
