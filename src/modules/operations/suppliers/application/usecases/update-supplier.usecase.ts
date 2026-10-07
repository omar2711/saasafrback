import { Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { SupplierEntity } from '../../domain/entities/supplier.entity';
import { UpdateSupplierDto } from '../../presentation/dto/update-supplier.dto';
import {
  normalizeSupplierTaxId,
  optionalText,
  requireSupplierName,
  rethrowSupplierConflict,
} from '../supplier-helpers';

interface SupplierRow {
  id: string;
  org_id: string;
  name: string;
  tax_id: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  state_region: string | null;
  location: string | null;
  company: string | null;
  notes: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UpdateSupplierUseCase {
  constructor(private readonly db: DbService) {}

  async execute(
    context: RlsContext,
    supplierId: string,
    dto: UpdateSupplierDto,
  ): Promise<SupplierEntity> {
    const resolvedStatus = dto.status ?? (dto.isActive !== undefined ? (dto.isActive ? 'active' : 'inactive') : null);

    // El nombre presente pasa por el mismo recorte que el indice unico 026.
    const normalizedName = dto.name === undefined ? null : requireSupplierName(dto.name);

    /*
     * Patron "campo presente" (el mismo de update-membership) en vez de COALESCE.
     * Con COALESCE, un campo enviado como null significaba "no tocar", asi que
     * vaciar el correo, el telefono o el NIT desde el formulario era imposible:
     * el valor anterior volvia al guardar. Y sin poder vaciar el NIT tampoco se
     * podia liberar uno duplicado desde la interfaz.
     */
    const optional = (value: string | null | undefined) => optionalText(value);

    const suppliers = await this.db
      .withRls(context, (client) =>
        client.query<SupplierRow>(
          `UPDATE suppliers
         SET name = COALESCE($1::text, name),
             tax_id = CASE WHEN $2::boolean THEN $3::text ELSE tax_id END,
             contact_name = CASE WHEN $4::boolean THEN $5::text ELSE contact_name END,
             email = CASE WHEN $6::boolean THEN $7::text ELSE email END,
             phone = CASE WHEN $8::boolean THEN $9::text ELSE phone END,
             address = CASE WHEN $10::boolean THEN $11::text ELSE address END,
             state_region = CASE WHEN $12::boolean THEN $13::text ELSE state_region END,
             location = CASE WHEN $14::boolean THEN $15::text ELSE location END,
             company = CASE WHEN $16::boolean THEN $17::text ELSE company END,
             notes = CASE WHEN $18::boolean THEN $19::text ELSE notes END,
             status = COALESCE($20::text, status)
         WHERE id = $21
         RETURNING id, org_id, name, tax_id, contact_name, email, phone, address, state_region, location, company, notes, status, created_at, updated_at`,
          [
            normalizedName,
            dto.taxId !== undefined,
            normalizeSupplierTaxId(dto.taxId),
            dto.contactName !== undefined,
            optional(dto.contactName),
            dto.email !== undefined,
            optional(dto.email),
            dto.phone !== undefined,
            optional(dto.phone),
            dto.address !== undefined,
            optional(dto.address),
            dto.stateRegion !== undefined,
            optional(dto.stateRegion),
            dto.location !== undefined,
            optional(dto.location),
            dto.company !== undefined,
            optional(dto.company),
            dto.notes !== undefined,
            optional(dto.notes),
            resolvedStatus,
            supplierId,
          ],
        ),
      )
      .catch(rethrowSupplierConflict);

    if (!suppliers[0]) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    const supplier = suppliers[0];
    return {
      id: supplier.id,
      orgId: supplier.org_id,
      name: supplier.name,
      taxId: supplier.tax_id ?? null,
      contactName: supplier.contact_name ?? null,
      email: supplier.email ?? null,
      phone: supplier.phone ?? null,
      address: supplier.address ?? null,
      stateRegion: supplier.state_region ?? null,
      location: supplier.location ?? null,
      company: supplier.company ?? null,
      notes: supplier.notes ?? null,
      status: supplier.status as SupplierEntity['status'],
      createdAt: supplier.created_at.toISOString(),
      updatedAt: supplier.updated_at.toISOString(),
    };
  }
}
