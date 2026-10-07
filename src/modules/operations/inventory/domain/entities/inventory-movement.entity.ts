export const INVENTORY_MOVEMENT_TYPES = [
  'purchase',
  'sale',
  'transfer_in',
  'transfer_out',
  'adjustment',
  'adjustment_out',
  'return',
  'damage',
] as const;

export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

/** Tipos que reducen el stock. El resto suma. */
export const NEGATIVE_MOVEMENT_TYPES: readonly InventoryMovementType[] = [
  'sale',
  'transfer_out',
  'adjustment_out',
  'damage',
];

/** Tipos manuales que exigen un motivo escrito por el operador. */
export const MOVEMENT_TYPES_REQUIRING_NOTES: readonly InventoryMovementType[] = [
  'adjustment_out',
  'damage',
];

export interface InventoryMovementEntity {
  id: string;
  orgId: string;
  branchId: string;
  branchName?: string | null;
  productId: string;
  productName?: string | null;
  productSku?: string | null;
  movementType: InventoryMovementType;
  quantity: number;
  unitCost?: number | null;
  totalCost?: number | null;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdByName?: string | null;
  createdAt: string;
}
