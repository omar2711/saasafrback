import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';
import { UUID_PATTERN } from '../../../../common/utils/uuid';

export class UpdateBranchDto {
  @ApiPropertyOptional({ example: 'Sucursal Norte' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'Av. Insurgentes 200' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Guadalajara' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '+525559876543' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  // `null` es "quitar el encargado", y por eso la validacion de UUID se salta
  // en ese caso en vez de rechazarlo.
  @ApiPropertyOptional({ nullable: true, description: 'Membresia del encargado; null lo quita' })
  @IsOptional()
  @ValidateIf((o: UpdateBranchDto) => o.managerMemberId !== null)
  @Matches(UUID_PATTERN, { message: 'El encargado debe ser un identificador valido' })
  managerMemberId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}
