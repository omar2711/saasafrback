import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { CustomerEntity } from '../../domain/entities/customer.entity';
import { UpdateCustomerDto } from '../../presentation/dto/update-customer.dto';
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
export class UpdateCustomerUseCase {
  constructor(private readonly db: DbService) {}

  async execute(
    context: RlsContext,
    customerId: string,
    dto: UpdateCustomerDto,
  ): Promise<CustomerEntity> {
    // SET dinamico en vez de COALESCE: con COALESCE un campo nunca se puede
    // limpiar, y el CI/NIT debe poder borrarse o corregirse (por ejemplo los
    // sufijos -DUP que deja la migracion 022 al deduplicar).
    const assignments: string[] = [];
    const values: unknown[] = [];

    const set = (column: string, value: unknown) => {
      values.push(value);
      assignments.push(`${column} = $${values.length}`);
    };

    if (dto.name !== undefined) set('name', dto.name);
    if (dto.taxId !== undefined) set('tax_id', normalizeTaxId(dto.taxId));
    if (dto.email !== undefined) set('email', dto.email || null);
    if (dto.phone !== undefined) set('phone', dto.phone || null);
    if (dto.address !== undefined) set('address', dto.address || null);
    if (dto.city !== undefined) set('city', dto.city || null);
    if (dto.status !== undefined) set('status', dto.status);

    if (assignments.length === 0) {
      throw new BadRequestException('No hay cambios para aplicar');
    }

    values.push(customerId);

    const customers = await this.db
      .withRls(context, (client) =>
        client.query<CustomerRow>(
          `UPDATE customers
           SET ${assignments.join(', ')}
           WHERE id = $${values.length} AND deleted_at IS NULL
           RETURNING id, org_id, name, tax_id, email, phone, address, city, status, created_at, updated_at`,
          values,
        ),
      )
      .catch(rethrowCustomerConflict);

    if (!customers[0]) {
      throw new NotFoundException('Cliente no encontrado');
    }

    const customer = customers[0];
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
