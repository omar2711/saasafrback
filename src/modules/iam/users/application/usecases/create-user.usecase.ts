import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DbService, RlsContext } from '../../../../../database/db.service';
import { AuditService } from '../../../../../common/audit/audit.service';
import { UserEntity } from '../../domain/entities/user.entity';
import { CreateUserDto } from '../../presentation/dto/create-user.dto';
import { mapUser, UserRow } from '../user.mapper';

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly db: DbService,
    private readonly audit: AuditService,
  ) {}

  async execute(context: RlsContext, dto: CreateUserDto): Promise<UserEntity> {
    const orgId = context.orgId;
    if (!orgId) {
      throw new ForbiddenException('Tenant context missing');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    // users.email es UNIQUE sensible a mayusculas; guardar siempre en minuscula
    // evita que "Ana@x.com" y "ana@x.com" convivan como dos cuentas distintas.
    const email = dto.email.trim().toLowerCase();

    // Mismo recorte + mayusculas que update-membership: si no, el indice unico
    // parcial de la 031 (org_members_org_tax_id_unique) ve " 123 " y "123" como
    // dos NIT distintos.
    const taxId = dto.taxId?.trim().toUpperCase() || null;
    const roleIds = dto.roleIds ?? [];

    const user = await this.db
      .withRls(context, async (client) => {
        // Pertenencia antes de insertar: la RLS frenaria un id de otra
        // organizacion, pero con un 500 opaco en vez de un motivo.
        if (roleIds.length > 0) {
          const found = await client.query<{ id: string }>(
            `SELECT id FROM roles WHERE id = ANY($1::uuid[]) AND org_id = $2`,
            [roleIds, orgId],
          );
          if (found.length !== roleIds.length) {
            throw new BadRequestException('Alguno de los roles no pertenece a esta organizacion');
          }
        }

        if (dto.branchId) {
          const branch = await client.query<{ id: string }>(
            `SELECT id FROM branches WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
            [dto.branchId, orgId],
          );
          if (branch.length === 0) {
            throw new BadRequestException('La sucursal seleccionada no pertenece a esta organizacion');
          }
        }

        const [created] = await client.query<UserRow>(
          `INSERT INTO users (email, password_hash, full_name, phone, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id, email, password_hash, full_name, phone, status, created_at, updated_at, deleted_at`,
          [email, passwordHash, dto.fullName.trim(), dto.phone?.trim() || null],
        );

        const [member] = await client.query<{ id: string }>(
          `INSERT INTO org_members (org_id, user_id, status, branch_id, tax_id)
           VALUES ($1, $2, 'active', $3, $4)
           RETURNING id`,
          [orgId, created.id, dto.branchId ?? null, taxId],
        );

        if (roleIds.length > 0) {
          const placeholders = roleIds.map((_, i) => `($1, $${i + 2})`).join(', ');
          await client.execute(
            `INSERT INTO user_roles (org_member_id, role_id) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
            [member.id, ...roleIds],
          );
        }

        await this.audit.recordInTransaction(client, context, {
          action: 'user.create',
          entityType: 'user',
          entityId: created.id,
          metadata: {
            email: created.email,
            fullName: created.full_name,
            roleIds,
            branchId: dto.branchId ?? null,
          },
        });

        return created;
      })
      .catch((error: unknown) => {
        const pgError = error as { code?: string; constraint?: string };
        if (pgError?.code === '23505') {
          if (pgError.constraint === 'users_email_key') {
            throw new ConflictException('Ya existe un usuario registrado con ese correo');
          }
          if (pgError.constraint === 'org_members_org_tax_id_unique') {
            throw new ConflictException('Ya existe un usuario con ese NIT/CI en esta organizacion');
          }
        }
        throw error;
      });

    return mapUser(user);
  }
}
