import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListProductCategoriesDto {
  @ApiPropertyOptional({ description: 'Filtrar conteos por sucursal' })
  @IsOptional()
  @IsUUID('loose')
  branchId?: string;
}
