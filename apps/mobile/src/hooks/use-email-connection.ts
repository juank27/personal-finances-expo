import type { EmailConnection } from "@finanzas/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

import { apiFetch } from "@/lib/api-client";

export const emailConnectionKey = ["email-connection"] as const;

export function useEmailConnection() {
  return useQuery({
    queryKey: emailConnectionKey,
    queryFn: () =>
      apiFetch<{ data: EmailConnection }>("/email-connections").then((res) => res.data),
  });
}

export function useConnectGmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiFetch<{ data: { authorizeUrl: string } }>(
        "/email-connections/google/start",
        { method: "POST" }
      );
      const redirectUri = makeRedirectUri({ scheme: "mobile", path: "email-sync-callback" });
      return WebBrowser.openAuthSessionAsync(data.authorizeUrl, redirectUri);
    },
    // The backend owns the actual connection state — refetch it regardless of how the
    // browser session ended (success, cancel, dismiss) instead of trusting the result shape.
    onSettled: () => queryClient.invalidateQueries({ queryKey: emailConnectionKey }),
  });
}

export function useDisconnectGmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<void>("/email-connections", { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: emailConnectionKey }),
  });
}
