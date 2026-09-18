import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";

import { THEME_COLORS } from "@/lib/theme-colors";

export default function TransactionsLayout() {
  const { colorScheme } = useColorScheme();
  const theme = THEME_COLORS[colorScheme ?? "light"];

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.foreground,
        contentStyle: { backgroundColor: theme.card },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Transacciones" }} />
      <Stack.Screen
        name="new"
        options={{ title: "Nueva transacción", presentation: "modal", animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}
