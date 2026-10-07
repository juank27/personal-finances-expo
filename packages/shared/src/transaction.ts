import type { TransactionType } from "./category";

export type TransactionSource = "manual" | "email-ai";

export interface Transaction {
  id: string;
  user_id: string;
  group_id: string | null;
  category_id: string;
  amount: string;
  type: TransactionType;
  date: string;
  note: string | null;
  source: TransactionSource;
  source_message_id: string | null;
  created_at: string;
}
