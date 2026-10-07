import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { UUID_PATTERN } from '../../../../../common/utils/uuid';

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: 'secret1234', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: '+521234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  /*
   * Rol, sucursal y NIT se asignan en el mismo alta y en la misma transaccion.
   * Encadenar POST /iam/users + PATCH /iam/memberships/:id desde el cliente
   * dejaba un usuario huerfano si la segunda llamada fallaba: no hay endpoint
   * para borrar usuarios, la cuenta ya consume cupo de max_users y el correo
   * queda tomado, asi que el reintento choca contra users_email_key.
   */
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @Matches(UUID_PATTERN, { each: true, message: 'Cada rol debe ser un identificador valido' })
  roleIds?: string[];

  @ApiPropertyOptional({ description: 'Sucursal asignada; sin ella el usuario ve todas las permitidas' })
  @IsOptional()
  @Matches(UUID_PATTERN, { message: 'La sucursal debe ser un identificador valido' })
  branchId?: string;

  @ApiPropertyOptional({ example: '1234567', description: 'NIT / CI dentro de esta organizacion' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;
}
