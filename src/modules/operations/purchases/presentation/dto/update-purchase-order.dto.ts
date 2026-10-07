import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ enum: ['draft', 'pending', 'ordered', 'approved', 'received', 'canceled'] })
  @IsOptional()
  @IsIn(['draft', 'pending', 'ordered', 'approved', 'received', 'canceled'])
  status?: 'draft' | 'pending' | 'ordered' | 'approved' | 'received' | 'canceled';

  @ApiPropertyOptional({ example: '2026-01-10T10:00:00Z' })
  @IsOptional()
  @IsString()
  orderedAt?: string;

  @ApiPropertyOptional({ example: '2026-01-12T10:00:00Z' })
  @IsOptional()
  @IsString()
  receivedAt?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  discountTotal?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  taxTotal?: number;

  @ApiPropertyOptional({ example: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notes?: string;
}
