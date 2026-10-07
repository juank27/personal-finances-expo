export type EmailConnectionStatus = "active" | "error" | "revoked";

export interface EmailConnection {
  connected: boolean;
  email: string | null;
  status: EmailConnectionStatus | null;
  last_synced_at: string | null;
  last_error: string | null;
}
