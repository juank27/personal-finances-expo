import type { TransactionType } from "./category";

export interface Transaction {
  id: string;
  user_id: string;
  group_id: string | null;
  category_id: string;
  amount: string;
  type: TransactionType;
  date: string;
  note: string | null;
}
