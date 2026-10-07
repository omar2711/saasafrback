import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { SupplierEntity } from '../../domain/entities/supplier.entity';

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
export class ListSuppliersUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext): Promise<SupplierEntity[]> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const suppliers = await this.db.withRls(context, (client) =>
      client.query<SupplierRow>(
        `SELECT id, org_id, name, tax_id, contact_name, email, phone, address, state_region, location, company, notes, status, created_at, updated_at
         FROM suppliers
         WHERE org_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [orgId],
      ),
    );

    return suppliers.map((supplier) => ({
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
    }));
  }
}
