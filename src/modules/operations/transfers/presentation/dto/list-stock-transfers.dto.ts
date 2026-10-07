import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class ListStockTransfersDto {
  @ApiPropertyOptional({ description: 'Filtrar por sucursal (origen o destino)' })
  @IsOptional()
  @IsUUID('loose')
  branchId?: string;

  @ApiPropertyOptional({ enum: ['in_transit', 'completed', 'voided'] })
  @IsOptional()
  @IsIn(['in_transit', 'completed', 'voided'])
  status?: 'in_transit' | 'completed' | 'voided';
}
