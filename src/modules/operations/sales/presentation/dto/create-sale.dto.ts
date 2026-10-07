import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
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

const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'credit', 'other'] as const;
type PaymentMethod = typeof PAYMENT_METHODS[number];

const SALE_STATUSES = ['draft', 'completed', 'voided', 'refunded', 'pending_delivery'] as const;
type SaleStatus = typeof SALE_STATUSES[number];

const DOCUMENT_TYPES = ['receipt', 'invoice'] as const;
type SaleDocumentType = typeof DOCUMENT_TYPES[number];

class CreateSaleItemDto {
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

  @ApiPropertyOptional({ example: 150, description: 'Si se omite, se usa el precio efectivo de la sucursal' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    example: '00000000-0000-0000-0000-000000000000',
    description: 'Orden de compra abierta contra la que se reserva esta linea (solo ventas con estado pending_delivery y sin stock actual)',
  })
  @IsOptional()
  @IsUUID('loose')
  purchaseOrderId?: string;
}

class CreateSalePaymentDto {
  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  method: PaymentMethod;

  @ApiPropertyOptional({ example: '2026-02-01T12:00:00Z' })
  @IsOptional()
  @IsString()
  paidAt?: string;
}

export class CreateSaleDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsUUID('loose')
  branchId: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('loose')
  customerId?: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('loose')
  quoteId?: string;

  @ApiProperty({ example: 'S-0001' })
  @IsString()
  saleNumber: string;

  @ApiPropertyOptional({ enum: SALE_STATUSES })
  @IsOptional()
  @IsIn(SALE_STATUSES)
  status?: SaleStatus;

  @ApiPropertyOptional({ example: '2026-02-01T12:00:00Z' })
  @IsOptional()
  @IsString()
  soldAt?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  taxTotal?: number;

  /**
   * 'invoice' emite la factura dentro de la misma transaccion de la venta y
   * exige NIT y razon social del cliente. Por defecto, recibo.
   */
  @ApiPropertyOptional({ enum: DOCUMENT_TYPES, default: 'receipt' })
  @IsOptional()
  @IsIn(DOCUMENT_TYPES)
  documentType?: SaleDocumentType;

  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsOptional()
  @IsIn(PAYMENT_METHODS)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'Juan Perez', description: 'Cliente ocasional; si viene customerId prevalece el cliente registrado' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ example: '1234567', description: 'CI / NIT del cliente ocasional' })
  @IsOptional()
  @IsString()
  clientNit?: string;

  @ApiPropertyOptional({ example: '+591 70000000' })
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional({ example: 'cliente@email.com' })
  @IsOptional()
  @IsString()
  clientEmail?: string;

  @ApiPropertyOptional({ example: 'Av. Principal 100' })
  @IsOptional()
  @IsString()
  clientAddress?: string;

  @ApiPropertyOptional({
    type: [CreateSalePaymentDto],
    description: 'Pagos iniciales. Obligatorio al menos uno con monto > 0 si status = pending_delivery (anticipo)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalePaymentDto)
  payments?: CreateSalePaymentDto[];

  @ApiProperty({ type: [CreateSaleItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  @ArrayMinSize(1)
  items: CreateSaleItemDto[];
}
