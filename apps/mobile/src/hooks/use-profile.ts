import type { Profile } from "@finanzas/shared";
import type { UpdateProfileInput } from "@finanzas/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

const profileKey = ["profile"] as const;

export function useProfile() {
  return useQuery({
    queryKey: profileKey,
    queryFn: () => apiFetch<{ data: Profile }>("/profiles/me").then((res) => res.data),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiFetch<{ data: Profile }>("/profiles/me", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey }),
  });
}
