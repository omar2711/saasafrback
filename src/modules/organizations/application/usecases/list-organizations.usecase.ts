import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import { OrganizationEntity } from '../../domain/entities/organization.entity';

interface OrgRow {
  id: string;
  name: string;
  tax_id: string | null;
  timezone: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class ListOrganizationsUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext): Promise<OrganizationEntity[]> {
    if (!context.userId) {
      throw new ForbiddenException('User context missing');
    }

    // Super admin: only return orgs where they have actual membership.
    // Without this, the RLS bypass would return ALL orgs in the system.
    const orgs = await this.db.withRls(context, (client) =>
      context.isSuperAdmin
        ? client.query<OrgRow>(
            `SELECT o.id, o.name, o.tax_id, o.timezone, o.status, o.created_at, o.updated_at
             FROM orgs o
             INNER JOIN org_members om ON om.org_id = o.id AND om.user_id = app.user_id() AND om.deleted_at IS NULL
             ORDER BY o.created_at DESC`,
          )
        : client.query<OrgRow>(
            'SELECT id, name, tax_id, timezone, status, created_at, updated_at FROM orgs ORDER BY created_at DESC',
          ),
    );

    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      taxId: org.tax_id ?? null,
      timezone: org.timezone,
      status: org.status as OrganizationEntity['status'],
      createdAt: org.created_at.toISOString(),
      updatedAt: org.updated_at.toISOString(),
    }));
  }
}
