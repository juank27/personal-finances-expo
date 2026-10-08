import type { EmailBackfillJob } from "@finanzas/shared";
import type { CreateEmailBackfillInput } from "@finanzas/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import { budgetsKey } from "./use-budgets";

export function useStartBackfill() {
  return useMutation({
    mutationFn: (input: CreateEmailBackfillInput) =>
      apiFetch<{ data: { jobId: string } }>("/email-sync/backfill", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((res) => res.data),
  });
}

export function useBackfillStatus(jobId: string | null, enabled: boolean) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["email-backfill", jobId],
    queryFn: async () => {
      const { data } = await apiFetch<{ data: EmailBackfillJob }>(
        `/email-sync/backfill/${jobId}`
      );
      if (data.status === "completed" && data.imported > 0) {
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: budgetsKey });
        queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
      }
      return data;
    },
    enabled: enabled && jobId !== null,
    // Poll every 2s while the job is still running; stop once it settles (completed/failed).
    refetchInterval: (query) => (query.state.data?.status === "running" ? 2000 : false),
  });
}
