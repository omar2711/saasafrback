import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { INVENTORY_MOVEMENT_TYPES } from '../../domain/entities/inventory-movement.entity';
import type { InventoryMovementType } from '../../domain/entities/inventory-movement.entity';

export class ListInventoryMovementsDto {
  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('loose')
  branchId?: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('loose')
  productId?: string;

  @ApiPropertyOptional({ enum: INVENTORY_MOVEMENT_TYPES })
  @IsOptional()
  @IsIn(INVENTORY_MOVEMENT_TYPES)
  movementType?: InventoryMovementType;

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
