export type EmailBackfillStatus = "running" | "completed" | "failed";

export interface EmailBackfillJob {
  id: string;
  user_id: string;
  date_from: string;
  date_to: string;
  status: EmailBackfillStatus;
  total_messages: number | null;
  processed: number;
  imported: number;
  skipped: number;
  errors: number;
  last_error: string | null;
  created_at: string;
  finished_at: string | null;
}
