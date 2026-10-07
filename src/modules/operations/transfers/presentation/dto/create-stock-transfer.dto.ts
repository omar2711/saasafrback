import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreateStockTransferItemDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsUUID('loose')
  productId: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @IsPositive()
  quantity: number;
}

export class CreateStockTransferDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsUUID('loose')
  sourceBranchId: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsUUID('loose')
  destBranchId: string;

  @ApiPropertyOptional({ example: 'Reabastecimiento sucursal centro' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateStockTransferItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateStockTransferItemDto)
  items: CreateStockTransferItemDto[];
}
