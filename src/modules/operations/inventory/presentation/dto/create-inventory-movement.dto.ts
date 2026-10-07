import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { INVENTORY_MOVEMENT_TYPES } from '../../domain/entities/inventory-movement.entity';
import type { InventoryMovementType } from '../../domain/entities/inventory-movement.entity';

export class CreateInventoryMovementDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsUUID('loose')
  branchId: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsUUID('loose')
  productId: string;

  @ApiProperty({ enum: INVENTORY_MOVEMENT_TYPES })
  @IsIn(INVENTORY_MOVEMENT_TYPES)
  movementType: InventoryMovementType;

  /** Siempre positiva: el signo lo determina movementType. */
  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiPropertyOptional({ example: 'purchase_order' })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('loose')
  referenceId?: string;

  @ApiPropertyOptional({ example: 'Producto danado en almacen' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
