export const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  return Number(value);
};

export const toNullableNumber = (
  value: string | number | null | undefined,
): number | null => {
  if (value === null || value === undefined) return null;
  return Number(value);
};
