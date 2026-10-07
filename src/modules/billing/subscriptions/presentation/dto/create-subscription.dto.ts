import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, IsUUID } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({ example: '00000000-0000-0000-0000-000000000000' })
  @IsUUID('loose')
  planId: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsString()
  startDate: string;

  @ApiProperty({ enum: ['monthly', 'yearly'] })
  @IsIn(['monthly', 'yearly'])
  renewalPeriod: 'monthly' | 'yearly';
}

