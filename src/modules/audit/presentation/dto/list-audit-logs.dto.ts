import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsISO8601, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ListAuditLogsDto {
  @ApiPropertyOptional({ description: 'Codigo de accion, p. ej. sale.void' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Tipo de entidad, p. ej. sale' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('loose')
  userId?: string;

  @ApiPropertyOptional({ description: 'Fecha inicial (ISO 8601), inclusive' })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha final (ISO 8601), inclusive' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

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
