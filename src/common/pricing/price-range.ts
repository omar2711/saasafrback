import { ForbiddenException } from '@nestjs/common';

export interface PriceRange {
  min: number | null;
  max: number | null;
}

export interface PriceRangeViolation {
  label: string;
  unitPrice: number;
  min: number | null;
  max: number | null;
}

/**
 * Resuelve el rango efectivo campo a campo: el limite de la sucursal si esta
 * definido, si no el global, si no sin limite. Es la misma regla que ya sigue
 * el precio efectivo (COALESCE(pbp.sale_price, p.sale_price)), y por eso se
 * resuelve por campo y no por fila: una sucursal puede fijar solo el minimo y
 * heredar el maximo global.
 */
export function resolvePriceRange(branch: PriceRange | null, global: PriceRange): PriceRange {
  return {
    min: branch?.min ?? global.min,
    max: branch?.max ?? global.max,
  };
}

export function isWithinRange(unitPrice: number, range: PriceRange): boolean {
  if (range.min !== null && unitPrice < range.min) return false;
  if (range.max !== null && unitPrice > range.max) return false;
  return true;
}

/**
 * Un solo 403 con todas las lineas fuera de rango, no uno por linea: el POS
 * muestra el mensaje completo y el vendedor corrige todo de una vez.
 *
 * Se lanza 403 y no 400 porque no es un dato mal formado: es una operacion que
 * el usuario no tiene permitida y que otro (el Gerente) si podria hacer.
 */
export function assertPricesWithinRange(
  violations: PriceRangeViolation[],
  canOverride: boolean,
): void {
  if (violations.length === 0 || canOverride) {
    return;
  }

  const details = violations.map((violation) => {
    const bounds: string[] = [];
    if (violation.min !== null) bounds.push(`minimo ${violation.min}`);
    if (violation.max !== null) bounds.push(`maximo ${violation.max}`);
    return `${violation.label}: ${violation.unitPrice} fuera del rango (${bounds.join(', ')})`;
  });

  throw new ForbiddenException({
    message: `Hay precios fuera del rango autorizado. ${details.join('. ')}`,
    code: 'PRICE_OUT_OF_RANGE',
    details,
  });
}
