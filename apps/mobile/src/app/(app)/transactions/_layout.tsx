import { Stack } from "expo-router";

export default function TransactionsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Transacciones" }} />
      <Stack.Screen
        name="new"
        options={{ title: "Nueva transacción", presentation: "modal", animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}
