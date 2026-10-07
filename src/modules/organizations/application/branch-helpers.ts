import { BadRequestException } from '@nestjs/common';
import { DbClient } from '../../../database/db.service';
import { BranchEntity } from '../domain/entities/branch.entity';

export interface BranchRow {
  id: string;
  org_id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  status: string;
  manager_member_id: string | null;
  manager_name?: string | null;
  is_main: boolean;
  created_at: Date;
  updated_at: Date;
}

export const BRANCH_COLUMNS =
  'id, org_id, name, address, city, phone, status, manager_member_id, is_main, created_at, updated_at';

export function mapBranch(row: BranchRow): BranchEntity {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    address: row.address ?? null,
    city: row.city ?? null,
    phone: row.phone ?? null,
    status: row.status as BranchEntity['status'],
    managerMemberId: row.manager_member_id ?? null,
    managerName: row.manager_name ?? null,
    isMain: row.is_main,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * La FK apunta a org_members sin restringir la organizacion (una FK compuesta
 * obligaria a anular tambien org_id con ON DELETE SET NULL, y org_id es NOT
 * NULL). Se comprueba aqui, con un mensaje que explique el problema en vez de
 * un 500 de la RLS.
 */
export async function assertManagerBelongsToOrg(
  client: DbClient,
  orgId: string,
  managerMemberId: string,
): Promise<void> {
  const rows = await client.query<{ id: string }>(
    `SELECT id FROM org_members
      WHERE id = $1 AND org_id = $2 AND status = 'active' AND deleted_at IS NULL`,
    [managerMemberId, orgId],
  );
  if (rows.length === 0) {
    throw new BadRequestException(
      'El encargado seleccionado no pertenece a esta organizacion o no esta activo',
    );
  }
}

/**
 * Solo puede haber una principal por organizacion (indice unico parcial de la
 * 033). Hay que desmarcar la anterior en la MISMA transaccion o el UPDATE
 * aborta.
 */
export async function clearOtherMainBranches(
  client: DbClient,
  orgId: string,
  exceptBranchId?: string,
): Promise<void> {
  await client.execute(
    `UPDATE branches SET is_main = false
      WHERE org_id = $1 AND is_main AND deleted_at IS NULL AND ($2::uuid IS NULL OR id <> $2::uuid)`,
    [orgId, exceptBranchId ?? null],
  );
}
