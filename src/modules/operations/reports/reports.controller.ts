import { Controller, Get, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Tenant } from '../../../common/decorators/tenant.decorator';
import type { JwtUser } from '../../../common/auth/jwt-user';
import type { TenantContext } from '../../../common/tenant/tenant-context';
import { buildRlsContext } from '../../../common/tenant/rls-context';
import { DbService, type RlsContext } from '../../../database/db.service';
import { ListSalesDto } from '../sales/presentation/dto/list-sales.dto';
import { ListQuotesDto } from '../quotes/presentation/dto/list-quotes.dto';
import { ListInventoryMovementsDto } from '../inventory/presentation/dto/list-inventory-movements.dto';

@Controller('operations/reports')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly db: DbService) {}

  private async summarize(context: RlsContext, kind: 'sales' | 'quotes' | 'movements', filter: ListSalesDto & ListInventoryMovementsDto) {
    if (!context.orgId) throw new ForbiddenException('Tenant context missing');
    const table = { sales: 'sales', quotes: 'quotes', movements: 'inventory_movements' }[kind];
    const dateColumn = kind === 'sales' ? 'sold_at' : 'created_at';
    const conditions = ['org_id = $1'];
    const params: unknown[] = [context.orgId];
    if (kind !== 'movements') conditions.push('deleted_at IS NULL');
    const add = (column: string, operator: string, value: unknown) => {
      if (value === undefined) return;
      params.push(value); conditions.push(`${column} ${operator} $${params.length}`);
    };
    add('branch_id', '=', filter.branchId);
    add(dateColumn, '>=', filter.dateFrom);
    add(dateColumn, '<=', filter.dateTo);
    if (kind !== 'movements') add('status', '=', filter.status);
    else { add('product_id', '=', filter.productId); add('movement_type', '=', filter.movementType); }
    const aggregates = kind === 'sales'
      ? `COALESCE(SUM(total) FILTER (WHERE status = 'completed'), 0) AS revenue`
      : kind === 'quotes' ? `COUNT(*) FILTER (WHERE status = 'converted') AS converted_count`
      : `COALESCE(SUM(CASE WHEN movement_type IN ('sale', 'transfer_out', 'adjustment_out', 'damage') THEN -quantity ELSE quantity END), 0) AS net_quantity`;
    const [row] = await this.db.withRls(context, client => client.query<Record<string, string>>(
      `SELECT COUNT(*) AS total_records, ${aggregates} FROM ${table} WHERE ${conditions.join(' AND ')}`, params));
    return {
      totalRecords: Number(row.total_records),
      ...(kind === 'sales' ? { revenue: Number(row.revenue) } : {}),
      ...(kind === 'quotes' ? { convertedCount: Number(row.converted_count) } : {}),
      ...(kind === 'movements' ? { netQuantity: Number(row.net_quantity) } : {}),
    };
  }

  @Get('sales/summary') @Permissions('sales.read')
  sales(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext, @Query() query: ListSalesDto) {
    return this.summarize(buildRlsContext(user, tenant), 'sales', query);
  }
  @Get('quotes/summary') @Permissions('quotes.read')
  quotes(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext, @Query() query: ListQuotesDto) {
    return this.summarize(buildRlsContext(user, tenant), 'quotes', query);
  }
  @Get('inventory/summary') @Permissions('inventory.read')
  inventory(@CurrentUser() user: JwtUser, @Tenant() tenant: TenantContext, @Query() query: ListInventoryMovementsDto) {
    return this.summarize(buildRlsContext(user, tenant), 'movements', query);
  }
}
