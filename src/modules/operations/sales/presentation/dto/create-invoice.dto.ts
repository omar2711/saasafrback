import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateInvoiceDto {
  /**
   * Opcional: si no viene, lo reserva `app.next_document_number` (FAC-00001).
   * Se mantiene para migrar numeraciones existentes, no para el uso normal.
   */
  @ApiPropertyOptional({ example: 'FAC-00001' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ example: '2026-02-10' })
  @IsOptional()
  @IsString()
  dueDate?: string;
}
