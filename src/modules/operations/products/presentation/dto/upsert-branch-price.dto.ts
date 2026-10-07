import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class UpsertBranchPriceDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsUUID('loose')
  productId: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsUUID('loose')
  branchId: string;

  @ApiPropertyOptional({ example: 120, description: 'Precio de venta para la sucursal (null = hereda global)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number | null;

  @ApiPropertyOptional({ example: 80, description: 'Costo para la sucursal (null = hereda global)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number | null;

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
