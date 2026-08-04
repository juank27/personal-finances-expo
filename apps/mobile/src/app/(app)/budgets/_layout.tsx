import { Stack } from "expo-router";

export default function BudgetsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Presupuestos" }} />
      <Stack.Screen
        name="new"
        options={{ title: "Nuevo presupuesto", presentation: "modal", animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}
