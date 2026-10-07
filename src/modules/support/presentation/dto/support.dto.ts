import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from '../../domain/entities/support-ticket.entity';

export class CreateTicketDto {
  @ApiProperty({ example: 'No puedo imprimir el recibo en hoja A4' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: 'Al elegir formato Hoja y presionar Ctrl+P se corta la tabla.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES, default: 'normal' })
  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: TicketPriority;
}

export class CreateTicketMessageDto {
  @ApiProperty({ example: 'Ya lo revisamos, prueba de nuevo.' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;
}

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: TICKET_STATUSES })
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES })
  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: TicketPriority;

  @ApiPropertyOptional({ description: 'Agente asignado. Solo lo puede cambiar un agente.' })
  @IsOptional()
  @IsUUID('loose')
  assignedTo?: string;
}

export class ListTicketsDto {
  @ApiPropertyOptional({ enum: TICKET_STATUSES })
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;

  @ApiPropertyOptional({
    description: 'Solo para agentes: filtrar por organizacion. El cliente siempre ve la suya.',
  })
  @IsOptional()
  @IsUUID('loose')
  orgId?: string;

  @ApiPropertyOptional({ description: 'Maximo de filas a devolver (por defecto 500, tope 2000)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filas a saltar para paginar' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
