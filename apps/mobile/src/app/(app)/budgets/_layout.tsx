import { Stack } from "expo-router";
import { useColorScheme } from "nativewind";

import { THEME_COLORS } from "@/lib/theme-colors";

export default function BudgetsLayout() {
  const { colorScheme } = useColorScheme();
  const theme = THEME_COLORS[colorScheme ?? "light"];

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.foreground,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Presupuestos" }} />
      <Stack.Screen
        name="new"
        options={{ title: "Nuevo presupuesto", presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: "Editar presupuesto", presentation: "modal", animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}
