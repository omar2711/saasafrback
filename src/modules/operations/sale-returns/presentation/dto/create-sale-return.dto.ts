import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export const RETURN_CONDITIONS = ['restock', 'damaged'] as const;
export type ReturnCondition = (typeof RETURN_CONDITIONS)[number];

export class CreateSaleReturnItemDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsUUID('loose')
  saleItemId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({
    enum: RETURN_CONDITIONS,
    default: 'restock',
    description:
      "'restock' vuelve al inventario vendible; 'damaged' entra y se da de baja en el mismo acto",
  })
  @IsOptional()
  @IsIn(RETURN_CONDITIONS)
  condition?: ReturnCondition;

  @ApiPropertyOptional({ example: 'Caja abierta, pantalla rayada' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateSaleReturnDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsUUID('loose')
  saleId: string;

  @ApiPropertyOptional({ example: 'Producto defectuoso' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ type: [CreateSaleReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleReturnItemDto)
  items: CreateSaleReturnItemDto[];
}
