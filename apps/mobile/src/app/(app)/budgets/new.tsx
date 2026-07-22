import type { BudgetPeriod } from "@finanzas/shared";
import { createBudgetSchema } from "@finanzas/validators";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Button } from "@/components/button";
import { CategoryPicker } from "@/components/category-picker";
import { useCreateBudget } from "@/hooks/use-budgets";
import { getCurrentPeriodRange } from "@/lib/date";

export default function NewBudget() {
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amountLimit, setAmountLimit] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createBudget = useCreateBudget();
  const range = getCurrentPeriodRange(period);

  function handleSubmit() {
    const parsed = createBudgetSchema.safeParse({
      category_id: categoryId,
      amount_limit: amountLimit,
      period,
      start_date: range.start_date,
      end_date: range.end_date,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    setError(null);
    createBudget.mutate(parsed.data, {
      onSuccess: () => router.back(),
      onError: (err) => setError(err instanceof Error ? err.message : "Error al crear"),
    });
  }

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-6" contentContainerClassName="gap-4 pb-10">
      <Text className="text-lg font-semibold">Categoría</Text>
      <CategoryPicker type="expense" value={categoryId} onChange={setCategoryId} />

      <TextInput
        className="rounded-lg border border-gray-300 px-4 py-3"
        placeholder="Límite (COP)"
        keyboardType="decimal-pad"
        value={amountLimit}
        onChangeText={setAmountLimit}
      />

      <View className="flex-row gap-2">
        <Pressable
          onPress={() => setPeriod("monthly")}
          className={`flex-1 rounded-lg border py-2 ${period === "monthly" ? "border-black bg-black" : "border-gray-300"}`}
        >
          <Text className={`text-center ${period === "monthly" ? "text-white" : "text-black"}`}>
            Mensual
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setPeriod("weekly")}
          className={`flex-1 rounded-lg border py-2 ${period === "weekly" ? "border-black bg-black" : "border-gray-300"}`}
        >
          <Text className={`text-center ${period === "weekly" ? "text-white" : "text-black"}`}>
            Semanal
          </Text>
        </Pressable>
      </View>

      <Text className="text-gray-500">
        Período: {range.start_date} a {range.end_date}
      </Text>

      {error ? <Text className="text-red-600">{error}</Text> : null}

      <Button title="Guardar" loading={createBudget.isPending} onPress={handleSubmit} />
    </ScrollView>
  );
}
