import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateQuoteItemDto {
  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000', description: 'Exactamente uno de productId/kitId' })
  @ValidateIf((o) => !o.kitId)
  @IsUUID('loose')
  productId?: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000', description: 'Exactamente uno de productId/kitId' })
  @ValidateIf((o) => !o.productId)
  @IsUUID('loose')
  kitId?: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ example: 100, description: 'Si se omite, se usa el precio efectivo de la sucursal' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

export class CreateQuoteDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsUUID('loose')
  branchId: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('loose')
  customerId?: string;

  @ApiProperty({ example: 'Q-0001' })
  @IsString()
  quoteNumber: string;

  @ApiPropertyOptional({ enum: ['pending', 'sent', 'approved', 'accepted', 'rejected', 'expired', 'converted'] })
  @IsOptional()
  @IsIn(['pending', 'sent', 'approved', 'accepted', 'rejected', 'expired', 'converted'])
  status?: 'pending' | 'sent' | 'approved' | 'accepted' | 'rejected' | 'expired' | 'converted';

  @ApiPropertyOptional({ example: '2026-02-01' })
  @IsOptional()
  @IsString()
  validUntil?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  taxTotal?: number;

  @ApiPropertyOptional({ example: 'Notas de la cotizacion' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Juan Perez' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ example: '+59170000000' })
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional({ example: 'cliente@email.com' })
  @IsOptional()
  @IsString()
  clientEmail?: string;

  @ApiPropertyOptional({ example: 'Empresa Cliente S.R.L.' })
  @IsOptional()
  @IsString()
  clientCompany?: string;

  @ApiPropertyOptional({ example: '12345678' })
  @IsOptional()
  @IsString()
  clientNit?: string;

  @ApiPropertyOptional({ example: 'Av. Principal 100' })
  @IsOptional()
  @IsString()
  clientAddress?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountTotal?: number;

  @ApiProperty({ type: [CreateQuoteItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteItemDto)
  @ArrayMinSize(1)
  items: CreateQuoteItemDto[];
}

