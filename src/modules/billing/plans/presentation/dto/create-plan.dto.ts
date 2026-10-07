import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, MinLength } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'starter' })
  @IsString()
  @MinLength(2)
  code: string;

  @ApiProperty({ example: 'Plan Starter' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 9.99 })
  @IsNumber()
  priceMonthly: number;

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  priceYearly: number;
}
