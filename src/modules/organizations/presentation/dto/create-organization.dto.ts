import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Mi Empresa S.A.' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'RFC123456789' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'America/Mexico_City' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
