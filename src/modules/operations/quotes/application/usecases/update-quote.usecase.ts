import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { toNumber } from '../../../../../common/utils/numbers';
import { QuoteEntity } from '../../domain/entities/quote.entity';
import { UpdateQuoteDto } from '../../presentation/dto/update-quote.dto';

interface QuoteRow {
  id: string;
  org_id: string;
  branch_id: string;
  customer_id: string | null;
  quote_number: string;
  status: string;
  valid_until: Date | null;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total: string;
  notes: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  client_company: string | null;
  client_nit: string | null;
  client_address: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UpdateQuoteUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, quoteId: string, dto: UpdateQuoteDto): Promise<QuoteEntity> {
    const quotes = await this.db.withRls(context, (client) =>
      client.query<QuoteRow>(
        `UPDATE quotes
         SET status = COALESCE($1::text, status),
             valid_until = COALESCE($2::date, valid_until),
             notes = COALESCE($3::text, notes),
             client_name = COALESCE($4::text, client_name),
             client_phone = COALESCE($5::text, client_phone),
             client_email = COALESCE($6::text, client_email)
         WHERE id = $7 AND deleted_at IS NULL
         RETURNING id, org_id, branch_id, customer_id, quote_number, status, valid_until, subtotal, discount_total, tax_total, total, notes, client_name, client_phone, client_email, client_company, client_nit, client_address, created_at, updated_at`,
        [
          dto.status ?? null,
          dto.validUntil ? new Date(dto.validUntil) : null,
          dto.notes ?? null,
          dto.clientName ?? null,
          dto.clientPhone ?? null,
          dto.clientEmail ?? null,
          quoteId,
        ],
      ),
    );

    if (!quotes[0]) {
      throw new NotFoundException('Quote not found');
    }

    const quote = quotes[0];
    return {
      id: quote.id,
      orgId: quote.org_id,
      branchId: quote.branch_id,
      customerId: quote.customer_id ?? null,
      quoteNumber: quote.quote_number,
      status: quote.status as QuoteEntity['status'],
      validUntil: quote.valid_until ? quote.valid_until.toISOString() : null,
      subtotal: toNumber(quote.subtotal),
      discountTotal: toNumber(quote.discount_total),
      taxTotal: toNumber(quote.tax_total),
      total: toNumber(quote.total),
      notes: quote.notes ?? null,
      clientName: quote.client_name ?? null,
      clientPhone: quote.client_phone ?? null,
      clientEmail: quote.client_email ?? null,
      clientCompany: quote.client_company ?? null,
      clientNit: quote.client_nit ?? null,
      clientAddress: quote.client_address ?? null,
      createdAt: quote.created_at.toISOString(),
      updatedAt: quote.updated_at.toISOString(),
    };
  }
}
