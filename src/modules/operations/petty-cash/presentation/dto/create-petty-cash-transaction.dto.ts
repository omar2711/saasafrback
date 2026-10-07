import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

const TRANSACTION_TYPES = ['income', 'expense'] as const;
type TransactionType = typeof TRANSACTION_TYPES[number];

export class CreatePettyCashTransactionDto {
  @ApiProperty({ enum: TRANSACTION_TYPES })
  @IsIn(TRANSACTION_TYPES)
  type: TransactionType;

  @ApiProperty({ example: 250.00 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'Compra de papelería' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'Papelería' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ example: 'FAC-12345' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000000' })
  @IsOptional()
  @IsUUID('loose')
  branchId?: string;
}
