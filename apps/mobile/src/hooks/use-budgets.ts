import type { Budget } from "@finanzas/shared";
import type { CreateBudgetInput } from "@finanzas/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

export interface BudgetWithProgress extends Budget {
  spent: string;
}

export const budgetsKey = ["budgets"] as const;

export function useBudgets() {
  return useQuery({
    queryKey: budgetsKey,
    queryFn: () => apiFetch<{ data: BudgetWithProgress[] }>("/budgets").then((res) => res.data),
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBudgetInput) =>
      apiFetch<{ data: Budget }>("/budgets", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsKey }),
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/budgets/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsKey }),
  });
}
