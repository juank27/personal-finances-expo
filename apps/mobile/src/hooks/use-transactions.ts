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
      queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
    },
  });
}

interface TransactionsPage {
  pages: Paginated<Transaction>[];
  pageParams: unknown[];
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/transactions/${id}`, { method: "DELETE" }),
    // Remove the row from every cached transactions query (any filter) immediately, so the
    // FlatList re-renders without it and the row's Reanimated `exiting` animation has
    // something to animate against — waiting for invalidate+refetch would skip the transition.
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      const previous = queryClient.getQueriesData<TransactionsPage>({ queryKey: ["transactions"] });

      queryClient.setQueriesData<TransactionsPage>({ queryKey: ["transactions"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => item.id !== id),
          })),
        };
      });

      return { previous };
    },
    onError: (_err, _id, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: budgetsKey });
      queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
    },
  });
}
