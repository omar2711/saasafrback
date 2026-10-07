import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateWorkScheduleDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    example: [1, 2, 3, 4, 5],
    description: 'ISO-8601: 1 = lunes ... 7 = domingo',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  days?: number[];

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La hora debe tener el formato HH:MM' })
  startTime?: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'La hora debe tener el formato HH:MM' })
  endTime?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Roles que pueden operar fuera de horario ademas de quien tiene settings.write',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('loose', { each: true })
  exemptRoleIds?: string[];

  @ApiPropertyOptional({ example: 'La tienda atiende de 08:00 a 18:00, de lunes a viernes.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
