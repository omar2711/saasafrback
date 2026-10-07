import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common';
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
import { ConvertQuoteToSaleUseCase } from '../application/usecases/convert-quote-to-sale.usecase';
import { CreateQuoteUseCase } from '../application/usecases/create-quote.usecase';
import { GetQuoteUseCase } from '../application/usecases/get-quote.usecase';
import { ListQuotesUseCase } from '../application/usecases/list-quotes.usecase';
import { UpdateQuoteUseCase } from '../application/usecases/update-quote.usecase';
import { ConvertQuoteToSaleDto } from './dto/convert-quote-to-sale.dto';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { ListQuotesDto } from './dto/list-quotes.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';

@ApiTags('Operations / Quotes')
@ApiBearerAuth()
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organizacion', required: true })
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller('operations/quotes')
export class QuotesController {
  constructor(
    private readonly createQuoteUseCase: CreateQuoteUseCase,
    private readonly listQuotesUseCase: ListQuotesUseCase,
    private readonly getQuoteUseCase: GetQuoteUseCase,
    private readonly updateQuoteUseCase: UpdateQuoteUseCase,
    private readonly convertQuoteToSaleUseCase: ConvertQuoteToSaleUseCase,
  ) {}

  @Post()
  @Permissions('quotes.write')
  @ApiOperation({ summary: 'Crear cotizacion' })
  create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @UserPermissions() granted: GrantedPermissions,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.createQuoteUseCase.execute(
      buildRlsContext(user, tenant),
      dto,
      granted.has('sales.price_override'),
    );
  }

  @Get()
  @Permissions('quotes.read')
  @ApiOperation({ summary: 'Listar cotizaciones' })
  list(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Query() query: ListQuotesDto,
  ) {
    return this.listQuotesUseCase.execute(buildRlsContext(user, tenant), query);
  }

  @Get(':id')
  @Permissions('quotes.read')
  @ApiOperation({ summary: 'Obtener cotizacion' })
  get(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.getQuoteUseCase.execute(buildRlsContext(user, tenant), id);
  }

  @Patch(':id')
  @Permissions('quotes.write')
  @ApiOperation({ summary: 'Actualizar cotizacion' })
  update(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateQuoteDto,
  ) {
    return this.updateQuoteUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }

  @Post(':id/convert-to-sale')
  @Permissions('quotes.convert')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Convertir cotizacion en venta' })
  convertToSale(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConvertQuoteToSaleDto,
  ) {
    return this.convertQuoteToSaleUseCase.execute(buildRlsContext(user, tenant), id, dto);
  }
}
