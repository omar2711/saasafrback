import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ConvertQuoteToSaleDto {
  @ApiProperty({ example: 'V-0001' })
  @IsString()
  saleNumber: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('loose')
  branchId?: string;

  @ApiPropertyOptional({ example: '2026-01-10T10:00:00Z' })
  @IsOptional()
  @IsString()
  soldAt?: string;
}

