export type BudgetPeriod = "monthly" | "weekly";

export interface Budget {
  id: string;
  user_id: string;
  group_id: string | null;
  category_id: string;
  amount_limit: string;
  period: BudgetPeriod;
  start_date: string;
  end_date: string;
  is_recurring: boolean;
}
