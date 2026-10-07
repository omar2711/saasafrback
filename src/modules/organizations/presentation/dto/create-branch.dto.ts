import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { UUID_PATTERN } from '../../../../common/utils/uuid';

export class CreateBranchDto {
  @ApiProperty({ example: 'Sucursal Centro' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Av. Reforma 100' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Ciudad de México' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: '+525551234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Membresia del encargado / dueno de la sucursal' })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'El encargado debe ser un identificador valido' })
  managerMemberId?: string;

  @ApiPropertyOptional({ description: 'Marca esta sucursal como la principal' })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}
