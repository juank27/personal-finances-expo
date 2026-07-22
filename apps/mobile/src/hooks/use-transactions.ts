import type { Paginated, Transaction } from "@finanzas/shared";
import type { CreateTransactionInput } from "@finanzas/validators";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import { budgetsKey } from "./use-budgets";

export interface TransactionFilters {
  category_id?: string;
  type?: "income" | "expense";
}

function transactionsKey(filters: TransactionFilters) {
  return ["transactions", filters] as const;
}

function buildQuery(filters: TransactionFilters, cursor?: string) {
  const params = new URLSearchParams();
  if (filters.category_id) params.set("category_id", filters.category_id);
  if (filters.type) params.set("type", filters.type);
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useInfiniteQuery({
    queryKey: transactionsKey(filters),
    queryFn: ({ pageParam }) =>
      apiFetch<{ data: Paginated<Transaction> }>(`/transactions${buildQuery(filters, pageParam)}`)
        .then((res) => res.data),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      apiFetch<{ data: Transaction }>("/transactions", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      // A new transaction changes any budget's computed `spent` for its category.
      queryClient.invalidateQueries({ queryKey: budgetsKey });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: budgetsKey });
    },
  });
}
