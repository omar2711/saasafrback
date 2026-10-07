import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { SupplierEntity } from '../../domain/entities/supplier.entity';
import { CreateSupplierDto } from '../../presentation/dto/create-supplier.dto';
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
export class CreateSupplierUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, dto: CreateSupplierDto): Promise<SupplierEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const rows = await this.db
      .withRls(context, (client) =>
        client.query<SupplierRow>(
          `INSERT INTO suppliers (org_id, name, tax_id, contact_name, email, phone, address, state_region, location, company, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
         RETURNING id, org_id, name, tax_id, contact_name, email, phone, address, state_region, location, company, notes, status, created_at, updated_at`,
          [
            orgId,
            requireSupplierName(dto.name),
            normalizeSupplierTaxId(dto.taxId),
            // Todos recortados, no solo el nombre y el NIT: " ACME " como razon
            // social entraba tal cual y luego no coincidia con nada al buscar.
            optionalText(dto.contactName),
            optionalText(dto.email),
            optionalText(dto.phone),
            optionalText(dto.address),
            optionalText(dto.stateRegion),
            optionalText(dto.location),
            optionalText(dto.company),
            optionalText(dto.notes),
          ],
        ),
      )
      .catch(rethrowSupplierConflict);

    const [supplier] = rows;

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
