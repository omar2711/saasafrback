import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { Tenant } from '../../../../common/decorators/tenant.decorator';
import type { JwtUser } from '../../../../common/auth/jwt-user';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../../../common/guards/permissions.guard';
import { Permissions } from '../../../../common/decorators/permissions.decorator';
import {
  UserPermissions,
  type GrantedPermissions,
} from '../../../../common/decorators/user-permissions.decorator';
import { buildRlsContext } from '../../../../common/tenant/rls-context';
import type { TenantContext } from '../../../../common/tenant/tenant-context';
import { CreateInventoryMovementUseCase } from '../application/usecases/create-inventory-movement.usecase';
import { ListInventoryMovementsUseCase } from '../application/usecases/list-inventory-movements.usecase';
import { ListInventoryStockUseCase } from '../application/usecases/list-inventory-stock.usecase';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { ListInventoryMovementsDto } from './dto/list-inventory-movements.dto';
import { ListInventoryStockDto } from './dto/list-inventory-stock.dto';

@ApiTags('Operations / Inventory')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organizacion', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('operations/inventory')
export class InventoryController {
  constructor(
    private readonly listStockUseCase: ListInventoryStockUseCase,
    private readonly listMovementsUseCase: ListInventoryMovementsUseCase,
    private readonly createMovementUseCase: CreateInventoryMovementUseCase,
  ) {}

  @Get('stock')
  @Permissions('inventory.read')
  @ApiOperation({ summary: 'Listar stock' })
  listStock(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Query() query: ListInventoryStockDto,
  ) {
    return this.listStockUseCase.execute(buildRlsContext(user, tenant), query);
  }

  @Get('movements')
  @Permissions('inventory.read')
  @ApiOperation({ summary: 'Listar movimientos de inventario' })
  listMovements(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Query() query: ListInventoryMovementsDto,
  ) {
    return this.listMovementsUseCase.execute(buildRlsContext(user, tenant), query);
  }

  @Post('movements')
  @Permissions('inventory.write')
  @ApiOperation({ summary: 'Registrar movimiento de inventario' })
  createMovement(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @UserPermissions() granted: GrantedPermissions,
    @Body() dto: CreateInventoryMovementDto,
  ) {
    // La baja por dano comparte endpoint con el ajuste de stock, asi que el
    // permiso extra no se puede declarar con @Permissions: depende del cuerpo.
    if (dto.movementType === 'damage') {
      granted.require('inventory.write_off');
    }

    return this.createMovementUseCase.execute(buildRlsContext(user, tenant), user.sub, dto);
  }
}
