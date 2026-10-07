import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProductCategoryDto {
  @ApiProperty({ example: 'Electronica' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Productos electronicos y accesorios' })
  @IsOptional()
  @IsString()
  description?: string;
}
