import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'credit', 'other'] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export class DeliverSalePaymentDto {
  @ApiPropertyOptional({ example: 350, description: 'Monto a cobrar al entregar. No puede superar el saldo.' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  method: PaymentMethod;

  @ApiPropertyOptional({ example: '2026-02-01T12:00:00Z' })
  @IsOptional()
  @IsString()
  paidAt?: string;
}

export class DeliverSaleDto {
  @ApiPropertyOptional({
    type: DeliverSalePaymentDto,
    description: 'Cobro del saldo pendiente. Se registra en la misma transaccion que la entrega.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliverSalePaymentDto)
  payment?: DeliverSalePaymentDto;
}
