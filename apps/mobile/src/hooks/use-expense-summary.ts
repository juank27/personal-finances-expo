import type { ExpenseSummary } from "@finanzas/shared";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

export function useExpenseSummary(month: string) {
  return useQuery({
    queryKey: ["expense-summary", month],
    queryFn: () =>
      apiFetch<{ data: ExpenseSummary }>(`/summary/expenses?month=${month}`).then(
        (res) => res.data
      ),
  });
}
