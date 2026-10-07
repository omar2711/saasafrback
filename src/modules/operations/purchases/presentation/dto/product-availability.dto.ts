import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ProductAvailabilityDto {
  @ApiProperty({ description: 'Producto a consultar' })
  @IsUUID('loose')
  productId: string;

  @ApiProperty({ description: 'Sucursal a consultar' })
  @IsUUID('loose')
  branchId: string;
}
