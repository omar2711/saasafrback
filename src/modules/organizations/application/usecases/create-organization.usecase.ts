import { ForbiddenException, Injectable } from '@nestjs/common';
import { DbService, RlsContext } from '../../../../database/db.service';
import { OrganizationEntity } from '../../domain/entities/organization.entity';
import { CreateOrganizationDto } from '../../presentation/dto/create-organization.dto';

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
export class CreateOrganizationUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, dto: CreateOrganizationDto): Promise<OrganizationEntity> {
    const userId = context.userId;
    if (!userId) {
      throw new ForbiddenException('User context missing');
    }

    const org = await this.db.withRls(context, async (client) => {
      const [created] = await client.query<OrgRow>(
        `INSERT INTO orgs (name, tax_id, timezone, status)
         VALUES ($1, $2, $3, 'active')
         RETURNING id, name, tax_id, timezone, status, created_at, updated_at`,
        [dto.name, dto.taxId ?? null, dto.timezone ?? 'UTC'],
      );

      await client.execute(
        `INSERT INTO org_members (org_id, user_id, status) VALUES ($1, $2, 'active')`,
        [created.id, userId],
      );

      return created;
    });

    return {
      id: org.id,
      name: org.name,
      taxId: org.tax_id ?? null,
      timezone: org.timezone,
      status: org.status as OrganizationEntity['status'],
      createdAt: org.created_at.toISOString(),
      updatedAt: org.updated_at.toISOString(),
    };
  }
}
