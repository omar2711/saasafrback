import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ListBranchPricesDto {
  @ApiProperty({ description: 'Sucursal para la cual listar precios efectivos' })
  @IsUUID('loose')
  branchId: string;
}
