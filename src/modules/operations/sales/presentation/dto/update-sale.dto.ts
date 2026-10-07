import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateSaleDto {
  @ApiPropertyOptional({ enum: ['draft', 'completed', 'voided', 'refunded'] })
  @IsOptional()
  @IsIn(['draft', 'completed', 'voided', 'refunded'])
  status?: 'draft' | 'completed' | 'voided' | 'refunded';

  @ApiPropertyOptional({ enum: ['cash', 'card', 'transfer', 'credit', 'other'] })
  @IsOptional()
  @IsIn(['cash', 'card', 'transfer', 'credit', 'other'])
  paymentMethod?: 'cash' | 'card' | 'transfer' | 'credit' | 'other';

  @ApiPropertyOptional({ example: 'Juan Perez' })
  @IsOptional()
  @IsString()
  clientName?: string;
}
