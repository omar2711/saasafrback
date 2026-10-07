import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class UpdateSupplierDto {
  @ApiPropertyOptional({ example: 'Proveedor Norte' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: '1234567' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'Maria Perez' })
  @IsOptional()
  @IsString()
  contactName?: string;

  // La cadena vacia significa "borrar el correo" y debe pasar la validacion.
  @ApiPropertyOptional({ example: 'proveedor@email.com' })
  @IsOptional()
  @ValidateIf((o: UpdateSupplierDto) => o.email !== '')
  @IsEmail({}, { message: 'El correo no tiene un formato valido' })
  email?: string;

  @ApiPropertyOptional({ example: '+59170000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Av. Central 200' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Cochabamba', description: 'Departamento / estado / provincia' })
  @IsOptional()
  @IsString()
  stateRegion?: string;

  @ApiPropertyOptional({ example: 'Bolivia', description: 'Pais / region' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: 'Distribuidora Norte S.R.L.' })
  @IsOptional()
  @IsString()
  company?: string;

  @ApiPropertyOptional({ example: 'Notas del proveedor' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;
}
