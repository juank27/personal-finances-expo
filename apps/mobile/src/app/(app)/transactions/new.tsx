import type { TransactionType } from "@finanzas/shared";
import { createTransactionSchema } from "@finanzas/validators";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Button } from "@/components/button";
import { CategoryPicker } from "@/components/category-picker";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { todayISODate } from "@/lib/date";

export default function NewTransaction() {
  const [type, setType] = useState<TransactionType>("expense");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISODate());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createTransaction = useCreateTransaction();

  function handleTypeChange(newType: TransactionType) {
    setType(newType);
    setCategoryId(null); // the category list changes with type, previous selection no longer valid
  }

  function handleSubmit() {
    const parsed = createTransactionSchema.safeParse({
      category_id: categoryId,
      amount,
      type,
      date,
      note: note || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    setError(null);
    createTransaction.mutate(parsed.data, {
      onSuccess: () => router.back(),
      onError: (err) => setError(err instanceof Error ? err.message : "Error al crear"),
    });
  }

  return (
    <ScrollView className="flex-1 bg-white px-6 pt-6" contentContainerClassName="gap-4 pb-10">
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => handleTypeChange("expense")}
          className={`flex-1 rounded-lg border py-2 ${type === "expense" ? "border-black bg-black" : "border-gray-300"}`}
        >
          <Text className={`text-center ${type === "expense" ? "text-white" : "text-black"}`}>
            Gasto
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleTypeChange("income")}
          className={`flex-1 rounded-lg border py-2 ${type === "income" ? "border-black bg-black" : "border-gray-300"}`}
        >
          <Text className={`text-center ${type === "income" ? "text-white" : "text-black"}`}>
            Ingreso
          </Text>
        </Pressable>
      </View>

      <CategoryPicker type={type} value={categoryId} onChange={setCategoryId} />

      <TextInput
        className="rounded-lg border border-gray-300 px-4 py-3"
        placeholder="Monto (COP)"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={setAmount}
      />

      <View className="flex-row items-center gap-2">
        <TextInput
          className="flex-1 rounded-lg border border-gray-300 px-4 py-3"
          placeholder="YYYY-MM-DD"
          value={date}
          onChangeText={setDate}
        />
        <Pressable
          className="rounded-lg border border-gray-300 px-4 py-3"
          onPress={() => setDate(todayISODate())}
        >
          <Text>Hoy</Text>
        </Pressable>
      </View>

      <TextInput
        className="rounded-lg border border-gray-300 px-4 py-3"
        placeholder="Nota (opcional)"
        value={note}
        onChangeText={setNote}
      />

      {error ? <Text className="text-red-600">{error}</Text> : null}

      <Button title="Guardar" loading={createTransaction.isPending} onPress={handleSubmit} />
    </ScrollView>
  );
}
