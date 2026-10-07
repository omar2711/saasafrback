import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PURCHASE_ORDER_STATUSES } from '../../domain/entities/purchase-order.entity';
import type { PurchaseOrderStatus } from '../../domain/entities/purchase-order.entity';

export class ListPurchaseOrdersDto {
  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('loose')
  branchId?: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('loose')
  supplierId?: string;

  @ApiPropertyOptional({ enum: PURCHASE_ORDER_STATUSES })
  @IsOptional()
  @IsIn(PURCHASE_ORDER_STATUSES)
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({ description: 'Fecha inicial de creacion (ISO 8601), inclusive' })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha final de creacion (ISO 8601), inclusive' })
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
