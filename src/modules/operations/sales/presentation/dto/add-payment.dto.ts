import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AddPaymentDto {
  @ApiProperty({ example: 200 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: ['cash', 'card', 'transfer', 'other'] })
  @IsIn(['cash', 'card', 'transfer', 'other'])
  method: 'cash' | 'card' | 'transfer' | 'other';

  @ApiPropertyOptional({ enum: ['pending', 'completed', 'voided'] })
  @IsOptional()
  @IsIn(['pending', 'completed', 'voided'])
  status?: 'pending' | 'completed' | 'voided';

  @ApiPropertyOptional({ example: '2026-02-01T12:00:00Z' })
  @IsOptional()
  @IsString()
  paidAt?: string;
}
