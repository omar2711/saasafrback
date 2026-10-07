import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePlanDto {
  @ApiPropertyOptional({ example: 'Plan Pro' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 19.99 })
  @IsOptional()
  @IsNumber()
  priceMonthly?: number;

  @ApiPropertyOptional({ example: 199.99 })
  @IsOptional()
  @IsNumber()
  priceYearly?: number;

  @ApiPropertyOptional({ enum: ['active', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'archived'])
  status?: 'active' | 'archived';
}
