import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class CreatePurchaseOrderItemDto {
  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsString()
  @Matches(UUID_RE, { message: 'productId must be a UUID' })
  productId?: string;

  @ApiPropertyOptional({ example: 'Producto Nuevo' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ example: 'SKU-NUEVO-001' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: 'Categoria A' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'unidad' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: 12.5 })
  @IsNumber()
  @Min(0)
  unitCost: number;
}

export class CreatePurchaseOrderDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsString()
  @Matches(UUID_RE, { message: 'branchId must be a UUID' })
  branchId: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsString()
  @Matches(UUID_RE, { message: 'supplierId must be a UUID' })
  supplierId: string;

  @ApiProperty({ example: 'PO-0001' })
  @IsString()
  orderNumber: string;

  @ApiPropertyOptional({ example: '2026-01-10T10:00:00Z' })
  @IsOptional()
  @IsString()
  orderedAt?: string;

  @ApiPropertyOptional({ enum: ['draft', 'pending', 'ordered', 'approved', 'received', 'canceled'] })
  @IsOptional()
  @IsIn(['draft', 'pending', 'ordered', 'approved', 'received', 'canceled'])
  status?: 'draft' | 'pending' | 'ordered' | 'approved' | 'received' | 'canceled';

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  discountTotal?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  taxTotal?: number;

  @ApiPropertyOptional({ example: 'Compra inicial' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreatePurchaseOrderItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderItemDto)
  @ArrayMinSize(1)
  items: CreatePurchaseOrderItemDto[];
}

