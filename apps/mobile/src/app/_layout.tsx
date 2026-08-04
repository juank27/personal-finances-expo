import "../../global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";

import { queryClient } from "@/lib/query-client";
import { SessionProvider, useSession } from "@/lib/session";

function RootNavigator() {
  const { session, isLoading } = useSession();
  // Ensures NativeWind's colorScheme state is subscribed at the root so `dark:` classes
  // (and the CSS-variable theme in global.css) track system appearance on native, not just web.
  useColorScheme();

  if (isLoading) return null;

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
