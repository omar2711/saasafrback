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
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateKitItemDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsUUID('loose')
  productId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @IsPositive()
  quantity: number;
}

export class CreateKitDto {
  @ApiProperty({ example: 'KIT-001' })
  @IsString()
  @MinLength(2)
  sku: string;

  @ApiProperty({ example: 'Combo Oficina Basico' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Laptop + mouse + mochila' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 6500 })
  @IsNumber()
  @Min(0)
  salePrice: number;

  @ApiProperty({ type: [CreateKitItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateKitItemDto)
  items: CreateKitItemDto[];
}
