export interface BranchPriceEntity {
  productId: string;
  sku: string;
  name: string;
  branchId: string;
  branchName?: string | null;
  globalSalePrice: number;
  globalCostPrice: number | null;
  branchSalePrice: number | null;
  branchCostPrice: number | null;
  effectiveSalePrice: number;
  effectiveCostPrice: number | null;
  globalMinSalePrice: number | null;
  globalMaxSalePrice: number | null;
  branchMinSalePrice: number | null;
  branchMaxSalePrice: number | null;
  /** Lo que realmente se exige al vender en esta sucursal. */
  effectiveMinSalePrice: number | null;
  effectiveMaxSalePrice: number | null;
  hasOverride: boolean;
}
