import "../../global.css";

import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { queryClient } from "@/lib/query-client";
import { SessionProvider, useSession } from "@/lib/session";
import { THEME_COLORS } from "@/lib/theme-colors";
import { useSkiaWebReady } from "@/lib/use-skia-web-ready";
import { useThemePreference } from "@/lib/use-theme-preference";

function RootNavigator() {
  const { session, isLoading } = useSession();
  // Ensures NativeWind's colorScheme state is subscribed at the root so `dark:` classes
  // (and the CSS-variable theme in global.css) track system appearance on native, not just web.
  // Also applies the persisted manual light/dark/system override, if any, before navigation mounts.
  useThemePreference();
  const isSkiaReady = useSkiaWebReady();
  const { colorScheme } = useColorScheme();
  const theme = THEME_COLORS[colorScheme ?? "light"];

  if (isLoading || !isSkiaReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
        {/* Presented as modals ON TOP of whichever tab is active (not nested inside the
            "transactions" tab's own stack) — so opening one from Home doesn't switch tabs,
            and closing it returns to exactly where it was opened, Home included. */}
        <Stack.Screen
          name="transaction/new"
          options={{
            headerShown: true,
            title: "Nueva transacción",
            presentation: "modal",
            animation: "slide_from_bottom",
            headerStyle: { backgroundColor: theme.card },
            headerTintColor: theme.foreground,
            contentStyle: { backgroundColor: theme.card },
          }}
        />
        <Stack.Screen
          name="transaction/[id]"
          options={{
            headerShown: true,
            title: "Editar transacción",
            presentation: "modal",
            animation: "slide_from_bottom",
            headerStyle: { backgroundColor: theme.card },
            headerTintColor: theme.foreground,
            contentStyle: { backgroundColor: theme.card },
          }}
        />
        <Stack.Screen
          name="budget-transactions/[id]"
          options={{
            headerShown: true,
            title: "Transacciones del presupuesto",
            presentation: "modal",
            animation: "slide_from_bottom",
            headerStyle: { backgroundColor: theme.card },
            headerTintColor: theme.foreground,
            contentStyle: { backgroundColor: theme.card },
          }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
        </QueryClientProvider>
      </SessionProvider>
      {/* Renders whatever @rn-primitives/portal-based components (Dialog, etc.) register —
          without this, Portal.tsx still runs its registration effect, but nothing ever
          consumes it, so dialogs silently never appear even though their trigger fires. */}
      <PortalHost />
    </GestureHandlerRootView>
  );
}
