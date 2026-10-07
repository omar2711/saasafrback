import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional, IsUUID } from 'class-validator';

export class InviteMemberDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ type: [String], example: ['00000000-0000-0000-0000-000000000000'] })
  @IsOptional()
  @IsArray()
  @IsUUID('loose', { each: true })
  roleIds?: string[];
}
