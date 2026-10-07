import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateQuoteDto {
  @ApiPropertyOptional({ enum: ['pending', 'sent', 'approved', 'accepted', 'rejected', 'expired', 'converted'] })
  @IsOptional()
  @IsIn(['pending', 'sent', 'approved', 'accepted', 'rejected', 'expired', 'converted'])
  status?: 'pending' | 'sent' | 'approved' | 'accepted' | 'rejected' | 'expired' | 'converted';

  @ApiPropertyOptional({ example: '2026-02-01' })
  @IsOptional()
  @IsString()
  validUntil?: string;

  @ApiPropertyOptional({ example: 'Notas actualizadas' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Juan Perez' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ example: '+59170000000' })
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional({ example: 'cliente@email.com' })
  @IsOptional()
  @IsString()
  clientEmail?: string;
}
