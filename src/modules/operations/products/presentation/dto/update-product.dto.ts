import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'SKU-002' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  sku?: string;

  @ApiPropertyOptional({ example: 'Producto Actualizado' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'Categoria B' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('loose')
  categoryId?: string;

  @ApiPropertyOptional({ example: 'Descripcion corta' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 110 })
  @IsOptional()
  @IsNumber()
  salePrice?: number;

  @ApiPropertyOptional({ example: 80 })
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

  @ApiPropertyOptional({ description: 'Sucursal a la que aplica el stock minimo' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'pending_pricing'] })
  @IsOptional()
  @IsIn(['active', 'inactive', 'pending_pricing'])
  status?: 'active' | 'inactive' | 'pending_pricing';

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
