import { Tabs } from "expo-router";

export default function AppLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: "Resumen" }} />
      <Tabs.Screen name="transactions" options={{ title: "Transacciones", headerShown: false }} />
      <Tabs.Screen name="budgets" options={{ title: "Presupuestos", headerShown: false }} />
      <Tabs.Screen name="categories" options={{ title: "Categorías" }} />
    </Tabs>
  );
}
