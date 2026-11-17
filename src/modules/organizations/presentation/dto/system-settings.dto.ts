import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateSystemSettingsDto {
  @ApiPropertyOptional({ example: 'IVA', description: 'Nombre del impuesto' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  taxName?: string;

  @ApiPropertyOptional({ example: 13, description: 'Porcentaje del impuesto (0 a 100)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({ example: 'BOB', description: 'Moneda del sistema (codigo ISO de 3 letras)' })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, { message: 'La moneda debe ser un codigo de 3 letras en mayuscula, por ejemplo BOB' })
  baseCurrency?: string;
}

export class SetExchangeRateDto {
  @ApiProperty({ example: 'USD', description: 'Moneda extranjera' })
  @Matches(/^[A-Z]{3}$/, { message: 'La moneda debe ser un codigo de 3 letras en mayuscula, por ejemplo USD' })
  currencyCode: string;

  @ApiProperty({ example: 6.96, description: '1 unidad de la moneda extranjera = X unidades de la moneda del sistema' })
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  rate: number;

  @ApiPropertyOptional({ example: '2026-11-15', description: 'Dia del tipo de cambio (por defecto, hoy)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener el formato AAAA-MM-DD' })
  effectiveDate?: string;
}