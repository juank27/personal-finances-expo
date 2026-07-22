import { Link } from "expo-router";
import { useMemo } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";

import { useCategories } from "@/hooks/use-categories";
import { useBudgets, useDeleteBudget, type BudgetWithProgress } from "@/hooks/use-budgets";
import { formatCOP } from "@/lib/currency";

const PERIOD_LABELS = { monthly: "Mensual", weekly: "Semanal" } as const;

function ProgressBar({ spent, limit }: { spent: number; limit: number }) {
  const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
  const overBudget = spent > limit;

  return (
    <View className="h-2 overflow-hidden rounded-full bg-gray-200">
      <View
        className={overBudget ? "h-2 rounded-full bg-red-600" : "h-2 rounded-full bg-black"}
        style={{ width: `${pct}%` }}
      />
    </View>
  );
}

export default function BudgetsList() {
  const { data: categories } = useCategories();
  const { data: budgets, isLoading } = useBudgets();
  const deleteBudget = useDeleteBudget();

  const categoryById = useMemo(() => {
    const map = new Map<string, string>();
    categories?.forEach((category) => map.set(category.id, category.name));
    return map;
  }, [categories]);

  function handleDelete(budget: BudgetWithProgress) {
    Alert.alert("Eliminar presupuesto", "¿Quieres eliminar este presupuesto?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => deleteBudget.mutate(budget.id),
      },
    ]);
  }

  return (
    <View className="flex-1 bg-white px-6 pt-4">
      <Link href="/budgets/new" asChild>
        <Pressable className="mb-4 rounded-lg bg-black py-3">
          <Text className="text-center font-semibold text-white">+ Nuevo presupuesto</Text>
        </Pressable>
      </Link>

      {isLoading ? (
        <Text className="text-gray-500">Cargando…</Text>
      ) : !budgets || budgets.length === 0 ? (
        <Text className="text-gray-500">No hay presupuestos todavía.</Text>
      ) : (
        <FlatList
          data={budgets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const spent = Number(item.spent);
            const limit = Number(item.amount_limit);
            return (
              <View className="mb-4 gap-2 rounded-lg border border-gray-200 p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="font-medium">
                    {categoryById.get(item.category_id) ?? "Sin categoría"}
                  </Text>
                  <Pressable onPress={() => handleDelete(item)}>
                    <Text className="text-red-600">✕</Text>
                  </Pressable>
                </View>
                <Text className="text-gray-500">
                  {PERIOD_LABELS[item.period]} · {item.start_date} a {item.end_date}
                </Text>
                <ProgressBar spent={spent} limit={limit} />
                <Text className={spent > limit ? "text-red-600" : "text-gray-700"}>
                  {formatCOP(spent)} de {formatCOP(limit)}
                </Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
