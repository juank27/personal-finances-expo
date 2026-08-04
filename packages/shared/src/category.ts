export type TransactionType = "income" | "expense";

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  type: TransactionType;
  is_default: boolean;
  archived_at: string | null;
}
