import "../../global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";

import { queryClient } from "@/lib/query-client";
import { SessionProvider, useSession } from "@/lib/session";
import { useSkiaWebReady } from "@/lib/use-skia-web-ready";
import { useThemePreference } from "@/lib/use-theme-preference";

function RootNavigator() {
  const { session, isLoading } = useSession();
  // Ensures NativeWind's colorScheme state is subscribed at the root so `dark:` classes
  // (and the CSS-variable theme in global.css) track system appearance on native, not just web.
  // Also applies the persisted manual light/dark/system override, if any, before navigation mounts.
  useThemePreference();
  const isSkiaReady = useSkiaWebReady();

  if (isLoading || !isSkiaReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
      </QueryClientProvider>
    </SessionProvider>
  );
}
