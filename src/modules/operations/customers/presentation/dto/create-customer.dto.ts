import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Cliente Central' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: '1234567' })
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional({ example: 'cliente@email.com' })
  @IsOptional()
  @ValidateIf((o: CreateCustomerDto) => o.email !== '')
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+59170000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'Av. Principal 100' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'La Paz' })
  @IsOptional()
  @IsString()
  city?: string;
}
