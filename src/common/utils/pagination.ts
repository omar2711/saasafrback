export const DEFAULT_PAGE_SIZE = 500;
export const MAX_PAGE_SIZE = 2000;

export interface PaginationFilter {
  limit?: number;
  offset?: number;
}

/**
 * Los listados de ventas, cotizaciones, compras y movimientos devolvian la
 * tabla entera. En una organizacion con dos anios de historial eso es una
 * consulta que crece sin techo y un JSON de varios MB por cada carga de la
 * pantalla de Reportes.
 *
 * Devuelve el fragmento `LIMIT $n OFFSET $m` y empuja los valores a `params`,
 * que es como estan construidas todas estas consultas. El limite se acota
 * siempre, tambien cuando el cliente pide uno mayor.
 */
export function buildPaginationClause(filter: PaginationFilter, params: unknown[]): string {
  const limit = clamp(filter.limit ?? DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const offset = Math.max(0, Math.trunc(filter.offset ?? 0));

  params.push(limit);
  const limitPlaceholder = `$${params.length}`;
  params.push(offset);
  const offsetPlaceholder = `$${params.length}`;

  return `LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return max === MAX_PAGE_SIZE ? DEFAULT_PAGE_SIZE : min;
  return Math.min(Math.max(Math.trunc(value), min), max);
}
