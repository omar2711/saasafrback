import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { UpdateOrganizationDto } from '../../presentation/dto/update-organization.dto';

interface OrgRow {
  id: string;
  name: string;
  tax_id: string | null;
  timezone: string;
  status: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  advance_sale_terms: string | null;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UpdateOrganizationUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, id: string, dto: UpdateOrganizationDto): Promise<OrganizationEntity> {
    const orgs = await this.db.withRls(context, (client) =>
      client.query<OrgRow>(
        `UPDATE orgs
         SET name = COALESCE($1::text, name),
             tax_id = COALESCE($2::text, tax_id),
             timezone = COALESCE($3::text, timezone),
             status = COALESCE($4::text, status),
             address = COALESCE($6::text, address),
             phone = COALESCE($7::text, phone),
             email = COALESCE($8::text, email),
             -- El booleano distingue "campo ausente" de "enviado vacio": vaciar
             -- las condiciones es una accion legitima y COALESCE no la permite.
             advance_sale_terms = CASE WHEN $9::boolean THEN $10::text ELSE advance_sale_terms END,
             updated_at = now()
         WHERE id = $5
         RETURNING id, name, tax_id, timezone, status, address, phone, email, advance_sale_terms,
                   created_at, updated_at`,
        [
          dto.name ?? null,
          dto.taxId ?? null,
          dto.timezone ?? null,
          dto.status ?? null,
          id,
          dto.address ?? null,
          dto.phone ?? null,
          dto.email ?? null,
          dto.advanceSaleTerms !== undefined,
          dto.advanceSaleTerms ?? null,
        ],
      ),
    );

    if (!orgs[0]) {
      throw new NotFoundException('Organization not found');
    }

    const org = orgs[0];
    return {
      id: org.id,
      name: org.name,
      taxId: org.tax_id ?? null,
      timezone: org.timezone,
      status: org.status as OrganizationEntity['status'],
      address: org.address ?? null,
      phone: org.phone ?? null,
      email: org.email ?? null,
      advanceSaleTerms: org.advance_sale_terms ?? null,
      createdAt: org.created_at.toISOString(),
      updatedAt: org.updated_at.toISOString(),
    };
  }
}
