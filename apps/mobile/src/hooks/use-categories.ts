import type { Category } from "@finanzas/shared";
import type { CreateCategoryInput, UpdateCategoryInput } from "@finanzas/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

const categoriesKey = ["categories"] as const;

export function useCategories() {
  return useQuery({
    queryKey: categoriesKey,
    queryFn: () => apiFetch<{ data: Category[] }>("/categories").then((res) => res.data),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      apiFetch<{ data: Category }>("/categories", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoriesKey }),
  });
}

export function useArchiveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      apiFetch<{ data: Category }>(`/categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    // Remove the archived row from cache immediately so the list re-renders without it and
    // the row's Reanimated `exiting` animation has something to animate against.
    onMutate: async ({ id, input }) => {
      if (!input.archived) return undefined;
      await queryClient.cancelQueries({ queryKey: categoriesKey });
      const previous = queryClient.getQueryData<Category[]>(categoriesKey);
      queryClient.setQueryData<Category[]>(categoriesKey, (old) =>
        old?.filter((category) => category.id !== id)
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(categoriesKey, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: categoriesKey }),
  });
}
