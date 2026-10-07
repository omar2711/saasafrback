import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import { OrganizationEntity } from '../../domain/entities/organization.entity';

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
export class GetOrganizationUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, id: string): Promise<OrganizationEntity> {
    if (!context.userId) {
      throw new ForbiddenException('User context missing');
    }

    const orgs = await this.db.withRls(context, (client) =>
      client.query<OrgRow>(
        `SELECT id, name, tax_id, timezone, status, address, phone, email, advance_sale_terms,
                created_at, updated_at
         FROM orgs WHERE id = $1`,
        [id],
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
