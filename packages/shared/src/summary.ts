import type { TransactionType } from "./category";

export interface CategoryExpenseSummary {
  category_id: string;
  type: TransactionType;
  amount: string;
}

export interface ExpenseSummary {
  month: string;
  total_income: string;
  total_expense: string;
  by_category: CategoryExpenseSummary[];
}
