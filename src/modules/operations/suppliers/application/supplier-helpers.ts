import { BadRequestException, ConflictException } from '@nestjs/common';

export const SUPPLIER_NAME_UNIQUE = 'suppliers_org_name_unique';
export const SUPPLIER_TAX_ID_UNIQUE = 'suppliers_org_tax_id_unique';

/**
 * Recorta el nombre igual que la migracion 026. El indice unico es sobre
 * lower(btrim(name)), asi que guardar ' ACME ' dejaria pasar un duplicado
 * aparente en la lista.
 */
export function normalizeSupplierName(name: string | null | undefined): string | null {
  if (name === null || name === undefined) {
    return null;
  }
  const normalized = name.trim();
  return normalized === '' ? null : normalized;
}

/** Recorte de cualquier campo opcional de texto; vacio -> null. */
export function optionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.trim() || null;
}

/**
 * Igual que en clientes: recorte + mayusculas, vacio -> null.
 */
export function normalizeSupplierTaxId(taxId: string | null | undefined): string | null {
  if (taxId === null || taxId === undefined) {
    return null;
  }
  const normalized = taxId.trim().toUpperCase();
  return normalized === '' ? null : normalized;
}

/**
 * El DTO valida que name no este vacio, pero '   ' pasa @IsString/@IsNotEmpty
 * segun la version de class-validator. Se vuelve a comprobar tras el recorte.
 */
export function requireSupplierName(name: string | null | undefined): string {
  const normalized = normalizeSupplierName(name);
  if (!normalized) {
    throw new BadRequestException('El nombre del proveedor es obligatorio');
  }
  return normalized;
}

/**
 * Traduce las violaciones de los indices unicos parciales a un 409 legible.
 * El indice es la unica garantia real: una comprobacion previa con SELECT deja
 * una ventana de carrera entre dos requests concurrentes.
 */
export function rethrowSupplierConflict(error: unknown): never {
  const pgError = error as { code?: string; constraint?: string };
  if (pgError?.code === '23505') {
    if (pgError.constraint === SUPPLIER_NAME_UNIQUE) {
      throw new ConflictException('Ya existe un proveedor con ese nombre en esta organizacion');
    }
    if (pgError.constraint === SUPPLIER_TAX_ID_UNIQUE) {
      throw new ConflictException('Ya existe un proveedor con ese NIT en esta organizacion');
    }
    // Red de seguridad: cualquier otro unico sobre suppliers (por ejemplo un
    // constraint antiguo que sobreviviera a la 026) salia como 500 "Internal
    // server error" en ingles, que es justo lo que la 026 venia a quitar.
    throw new ConflictException('Ya existe un proveedor con esos datos en esta organizacion');
  }
  throw error;
}
