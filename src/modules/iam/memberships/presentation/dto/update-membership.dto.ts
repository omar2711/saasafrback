import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator';
import type { MembershipStatus } from '../../domain/entities/membership.entity';

export class UpdateMembershipDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('loose', { each: true })
  roleIds?: string[];

  @ApiPropertyOptional({ enum: ['active', 'invited', 'disabled'] })
  @IsOptional()
  @IsIn(['active', 'invited', 'disabled'])
  status?: MembershipStatus;

  @ApiPropertyOptional({ description: 'Sucursal asignada (null para ninguna)', nullable: true })
  @IsOptional()
  @ValidateIf((o) => o.branchId !== null)
  @IsUUID('loose')
  branchId?: string | null;

  @ApiPropertyOptional({
    description: 'NIT/CI del miembro, unico dentro de la organizacion. Cadena vacia para borrarlo.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;
}
