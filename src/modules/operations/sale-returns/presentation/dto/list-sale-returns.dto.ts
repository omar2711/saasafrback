import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class ListSaleReturnsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('loose')
  saleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('loose')
  branchId?: string;

  @ApiPropertyOptional({ enum: ['completed', 'voided'] })
  @IsOptional()
  @IsIn(['completed', 'voided'])
  status?: 'completed' | 'voided';
}
