/**
 * Formato, no version. `@IsUUID('all')` de class-validator exige que el nibble
 * de version sea 1-5, y los identificadores sembrados de la demo
 * (4e000001-0000-0000-0000-000000000003) llevan un 0: los rechazaba enteros.
 * Usar `@Matches(UUID_PATTERN)` en los DTO en vez de `@IsUUID`.
 */
export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value?: string | null): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value);
