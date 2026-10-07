import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'SKU-001' })
  @IsString()
  @MinLength(2)
  sku: string;

  @ApiProperty({ example: 'Producto Base' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Categoria A' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('loose')
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Descripcion del producto' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  salePrice: number;

  @ApiPropertyOptional({ example: 70 })
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @ApiPropertyOptional({ example: 'unidad' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/img.jpg' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('loose')
  branchId?: string;

  @ApiPropertyOptional({ example: 90, description: 'Precio minimo autorizado (null = sin limite)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSalePrice?: number | null;

  @ApiPropertyOptional({ example: 130, description: 'Precio maximo autorizado (null = sin limite)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSalePrice?: number | null;
}

