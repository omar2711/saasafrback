import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
  profile_locked: boolean;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class UpdateOrganizationUseCase {
  constructor(private readonly db: DbService) {}

  async execute(context: RlsContext, id: string, dto: UpdateOrganizationDto): Promise<OrganizationEntity> {
    const isSuperAdmin = Boolean(context.isSuperAdmin);

    const orgs = await this.db.withRls(context, async (client) => {
      // Los datos se cargan una sola vez: al guardar se marca profile_locked y
      // desde ahí el WHERE ya no encuentra la fila. El super administrador de
      // la plataforma puede corregir y su guardado no bloquea.
      const updated = await client.query<OrgRow>(
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
             profile_locked = CASE WHEN $11::boolean THEN profile_locked ELSE true END,
             updated_at = now()
         WHERE id = $5 AND (profile_locked = false OR $11::boolean)
         RETURNING id, name, tax_id, timezone, status, address, phone, email, advance_sale_terms,
                   profile_locked, created_at, updated_at`,
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
          isSuperAdmin,
        ],
      );

      if (updated.length === 0) {
        const exists = await client.query<{ id: string }>('SELECT id FROM orgs WHERE id = $1', [id]);
        if (exists.length > 0) {
          throw new ForbiddenException(
            'Los datos de la empresa ya fueron registrados y no se pueden modificar.',
          );
        }
      }

      return updated;
    });

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
      profileLocked: org.profile_locked,
      createdAt: org.created_at.toISOString(),
      updatedAt: org.updated_at.toISOString(),
    };
  }
}