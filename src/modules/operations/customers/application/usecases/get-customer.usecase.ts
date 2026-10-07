import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { CustomerEntity } from '../../domain/entities/customer.entity';

interface CustomerRow {
  id: string;
  org_id: string;
  name: string;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class GetCustomerUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, customerId: string): Promise<CustomerEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const customers = await this.db.withRls(context, (client) =>
      client.query<CustomerRow>(
        `SELECT id, org_id, name, tax_id, email, phone, address, city, status, created_at, updated_at
         FROM customers
         WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
        [customerId, orgId],
      ),
    );

    const customer = customers[0];
    if (!customer) {
      throw new NotFoundException('Cliente no encontrado');
    }

    return {
      id: customer.id,
      orgId: customer.org_id,
      name: customer.name,
      taxId: customer.tax_id ?? null,
      email: customer.email ?? null,
      phone: customer.phone ?? null,
      address: customer.address ?? null,
      city: customer.city ?? null,
      status: customer.status as CustomerEntity['status'],
      createdAt: customer.created_at.toISOString(),
      updatedAt: customer.updated_at.toISOString(),
    };
  }
}
