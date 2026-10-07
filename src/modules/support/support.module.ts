import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CommonModule } from '../../common/common.module';
import { DatabaseModule } from '../../database/database.module';
import { AddTicketMessageUseCase } from './application/usecases/add-ticket-message.usecase';
import { CreateTicketUseCase } from './application/usecases/create-ticket.usecase';
import { GetTicketUseCase } from './application/usecases/get-ticket.usecase';
import { ListTicketsUseCase } from './application/usecases/list-tickets.usecase';
import { UpdateTicketUseCase } from './application/usecases/update-ticket.usecase';
import { SupportController } from './presentation/support.controller';
import { SupportGateway } from './presentation/support.gateway';

@Module({
  imports: [CommonModule, DatabaseModule, JwtModule.register({})],
  controllers: [SupportController],
  providers: [
    CreateTicketUseCase,
    ListTicketsUseCase,
    GetTicketUseCase,
    UpdateTicketUseCase,
    AddTicketMessageUseCase,
    SupportGateway,
  ],
})
export class SupportModule {}
