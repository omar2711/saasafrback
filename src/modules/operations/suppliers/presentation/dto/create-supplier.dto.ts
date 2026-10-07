import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Proveedor Central' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: '1234567' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'Juan Perez' })
  @IsOptional()
  @IsString()
  contactName?: string;

  // La cadena vacia significa "sin correo" y debe pasar: es como se borra el
  // campo desde el formulario. @IsEmail por si sola la rechazaria.
  @ApiPropertyOptional({ example: 'proveedor@email.com' })
  @IsOptional()
  @ValidateIf((o: CreateSupplierDto) => o.email !== '')
  @IsEmail({}, { message: 'El correo no tiene un formato valido' })
  email?: string;

  @ApiPropertyOptional({ example: '+59170000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Av. Principal 100' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Santa Cruz', description: 'Departamento / estado / provincia' })
  @IsOptional()
  @IsString()
  stateRegion?: string;

  @ApiPropertyOptional({ example: 'Bolivia', description: 'Pais / region' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'Distribuidora Central S.R.L.' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ example: 'Proveedor confiable desde 2020' })
  @IsOptional()
  @IsString()
  notes?: string;
}
