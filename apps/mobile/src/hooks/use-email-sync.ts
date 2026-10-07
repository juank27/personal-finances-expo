import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import { budgetsKey } from "./use-budgets";
import { emailConnectionKey } from "./use-email-connection";

interface EmailSyncResult {
  status:
    | "synced"
    | "skipped_no_connection"
    | "skipped_in_progress"
    | "revoked"
    | "error";
  imported: number;
  skipped: number;
  errors: number;
}

// Same queryKey shared across every screen that mounts this hook (Home, Transactions) —
// TanStack Query dedupes the actual network call, so no manual throttling is needed.
const emailSyncCheckKey = ["email-sync-check"] as const;

export function useEmailSyncCheck(enabled: boolean) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: emailSyncCheckKey,
    queryFn: async () => {
      const { data } = await apiFetch<{ data: EmailSyncResult }>("/email-sync/check", {
        method: "POST",
      });
      if (data.imported > 0) {
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: budgetsKey });
        queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
      }
      if (data.status === "revoked") {
        queryClient.invalidateQueries({ queryKey: emailConnectionKey });
      }
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
