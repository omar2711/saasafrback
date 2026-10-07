import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Tenant } from '../../../common/decorators/tenant.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import type { JwtUser } from '../../../common/auth/jwt-user';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { OptionalTenantGuard } from '../../../common/guards/optional-tenant.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { buildRlsContext } from '../../../common/tenant/rls-context';
import type { TenantContext } from '../../../common/tenant/tenant-context';
import { AddTicketMessageUseCase } from '../application/usecases/add-ticket-message.usecase';
import { CreateTicketUseCase } from '../application/usecases/create-ticket.usecase';
import { GetTicketUseCase } from '../application/usecases/get-ticket.usecase';
import { ListTicketsUseCase } from '../application/usecases/list-tickets.usecase';
import { UpdateTicketUseCase } from '../application/usecases/update-ticket.usecase';
import {
  CreateTicketDto,
  CreateTicketMessageDto,
  ListTicketsDto,
  UpdateTicketDto,
} from './dto/support.dto';
import { SupportGateway } from './support.gateway';

@ApiTags('Support')
@ApiBearerAuth()
// La cabecera es obligatoria para un miembro, pero no para el super admin, que
// atiende los tickets sin tener ninguna organizacion seleccionada.
@ApiHeader({ name: 'x-tenant-id', description: 'ID de la organizacion', required: false })
@UseGuards(JwtAuthGuard, OptionalTenantGuard, PermissionsGuard)
@Controller('support/tickets')
export class SupportController {
  constructor(
    private readonly createTicketUseCase: CreateTicketUseCase,
    private readonly listTicketsUseCase: ListTicketsUseCase,
    private readonly getTicketUseCase: GetTicketUseCase,
    private readonly updateTicketUseCase: UpdateTicketUseCase,
    private readonly addTicketMessageUseCase: AddTicketMessageUseCase,
    private readonly gateway: SupportGateway,
  ) {}

  @Post()
  @Permissions('support.write')
  @ApiOperation({ summary: 'Abrir un ticket de soporte' })
  async create(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Body() dto: CreateTicketDto,
  ) {
    const ticket = await this.createTicketUseCase.execute(buildRlsContext(user, tenant), dto);
    // Se emite DESPUES de persistir: el gateway solo retransmite hechos.
    this.gateway.emitTicket(ticket);
    return ticket;
  }

  @Get()
  @Permissions('support.read')
  @ApiOperation({ summary: 'Listar tickets' })
  list(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Query() query: ListTicketsDto,
  ) {
    return this.listTicketsUseCase.execute(buildRlsContext(user, tenant), query);
  }

  @Get(':id')
  @Permissions('support.read')
  @ApiOperation({ summary: 'Obtener un ticket con su hilo de mensajes' })
  get(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.getTicketUseCase.execute(buildRlsContext(user, tenant), id);
  }

  @Patch(':id')
  @Permissions('support.write')
  @ApiOperation({ summary: 'Cambiar estado, prioridad o asignacion' })
  async update(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    const ticket = await this.updateTicketUseCase.execute(buildRlsContext(user, tenant), id, dto);
    this.gateway.emitTicket(ticket);
    return ticket;
  }

  @Post(':id/messages')
  @Permissions('support.write')
  @ApiOperation({ summary: 'Responder en el hilo del ticket' })
  async addMessage(
    @CurrentUser() user: JwtUser,
    @Tenant() tenant: TenantContext,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: CreateTicketMessageDto,
  ) {
    const result = await this.addTicketMessageUseCase.execute(
      buildRlsContext(user, tenant),
      id,
      dto,
    );
    this.gateway.emitMessage(result.orgId, id, result.message);
    // Responder cambia el estado del ticket (open -> waiting_customer y
    // viceversa). Sin este segundo evento, el badge de la lista se quedaba
    // obsoleto hasta recargar.
    if (result.ticket) {
      this.gateway.emitTicket(result.ticket);
    }
    return result.message;
  }
}
