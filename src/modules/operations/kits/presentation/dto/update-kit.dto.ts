import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateKitItemDto } from './create-kit.dto';

export class UpdateKitDto {
  @ApiPropertyOptional({ example: 'KIT-001' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  sku?: string;

  @ApiPropertyOptional({ example: 'Combo Oficina Basico' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'Descripcion actualizada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 6200 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({ type: [CreateKitItemDto], description: 'Si se envia, reemplaza por completo los componentes del kit' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateKitItemDto)
  items?: CreateKitItemDto[];
}
