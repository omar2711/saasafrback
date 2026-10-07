export type PettyCashTransactionType = 'income' | 'expense';

export interface PettyCashTransactionEntity {
  id: string;
  orgId: string;
  branchId: string | null;
  type: PettyCashTransactionType;
  amount: number;
  description: string;
  category: string;
  reference: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PettyCashSummaryEntity {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}
