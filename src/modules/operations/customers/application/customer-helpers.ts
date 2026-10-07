import { ConflictException } from '@nestjs/common';

export const CUSTOMER_TAX_ID_UNIQUE = 'customers_org_tax_id_unique';

/**
 * Normaliza el CI/NIT igual que la migracion 022: recorte + mayusculas, vacio -> null.
 * Sin esto ' 12345678 ' y '12345678' no colisionarian contra el indice unico.
 */
export function normalizeTaxId(taxId: string | null | undefined): string | null {
  if (taxId === null || taxId === undefined) {
    return null;
  }
  const normalized = taxId.trim().toUpperCase();
  return normalized === '' ? null : normalized;
}

/**
 * Traduce la violacion del indice unico parcial de CI/NIT a un 409 legible.
 * El indice es la unica garantia real: una validacion previa con SELECT deja
 * una ventana de carrera entre dos requests concurrentes.
 */
export function rethrowCustomerConflict(error: unknown): never {
  const pgError = error as { code?: string; constraint?: string };
  if (pgError?.code === '23505' && pgError?.constraint === CUSTOMER_TAX_ID_UNIQUE) {
    throw new ConflictException('Ya existe un cliente con ese CI/NIT en esta organizacion');
  }
  throw error;
}
