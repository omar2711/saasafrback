import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { CreateCustomerDto } from '../../presentation/dto/create-customer.dto';
import { normalizeTaxId, rethrowCustomerConflict } from '../customer-helpers';

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
export class CreateCustomerUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, dto: CreateCustomerDto): Promise<CustomerEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const rows = await this.db
      .withRls(context, (client) =>
        client.query<CustomerRow>(
          `INSERT INTO customers (org_id, name, tax_id, email, phone, address, city, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
           RETURNING id, org_id, name, tax_id, email, phone, address, city, status, created_at, updated_at`,
          [
            orgId,
            dto.name,
            normalizeTaxId(dto.taxId),
            dto.email ?? null,
            dto.phone ?? null,
            dto.address ?? null,
            dto.city ?? null,
          ],
        ),
      )
      .catch(rethrowCustomerConflict);

    const [customer] = rows;

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
