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
    // Remove the row from cache immediately so the list re-renders without it and the
    // row's Reanimated `exiting` animation has something to animate against — waiting for
    // the invalidate+refetch round trip would just make the row disappear with no transition.
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: budgetsKey });
      const previous = queryClient.getQueryData<BudgetWithProgress[]>(budgetsKey);
      queryClient.setQueryData<BudgetWithProgress[]>(
        budgetsKey,
        (old) => old?.filter((budget) => budget.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(budgetsKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: budgetsKey }),
  });
}
