import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('loose')
  planId?: string;

  @ApiPropertyOptional({ enum: ['monthly', 'yearly'] })
  @IsOptional()
  @IsIn(['monthly', 'yearly'])
  renewalPeriod?: 'monthly' | 'yearly';
}

