import type { Transaction } from "@finanzas/shared";
import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";

import { useCategories } from "@/hooks/use-categories";
import {
  useDeleteTransaction,
  useTransactions,
  type TransactionFilters,
} from "@/hooks/use-transactions";
import { formatCOP } from "@/lib/currency";

const FILTERS: { label: string; value: TransactionFilters["type"] }[] = [
  { label: "Todos", value: undefined },
  { label: "Ingresos", value: "income" },
  { label: "Gastos", value: "expense" },
];

export default function TransactionsList() {
  const [type, setType] = useState<TransactionFilters["type"]>(undefined);
  const { data: categories } = useCategories();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useTransactions({
    type,
  });
  const deleteTransaction = useDeleteTransaction();

  const categoryById = useMemo(() => {
    const map = new Map<string, string>();
    categories?.forEach((category) => map.set(category.id, category.name));
    return map;
  }, [categories]);

  const transactions = data?.pages.flatMap((page) => page.items) ?? [];

  function handleDelete(transaction: Transaction) {
    Alert.alert("Eliminar transacción", "¿Quieres eliminar este movimiento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => deleteTransaction.mutate(transaction.id),
      },
    ]);
  }

  return (
    <View className="flex-1 bg-white px-6 pt-4">
      <View className="mb-4 flex-row gap-2">
        {FILTERS.map((filter) => (
          <Pressable
            key={filter.label}
            onPress={() => setType(filter.value)}
            className={`flex-1 rounded-lg border py-2 ${
              type === filter.value ? "border-black bg-black" : "border-gray-300"
            }`}
          >
            <Text className={`text-center ${type === filter.value ? "text-white" : "text-black"}`}>
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Link href="/transactions/new" asChild>
        <Pressable className="mb-4 rounded-lg bg-black py-3">
          <Text className="text-center font-semibold text-white">+ Nueva transacción</Text>
        </Pressable>
      </Link>

      {isLoading ? (
        <Text className="text-gray-500">Cargando…</Text>
      ) : transactions.length === 0 ? (
        <Text className="text-gray-500">No hay transacciones todavía.</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <Text className="py-4 text-center text-gray-500">Cargando más…</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <View className="flex-row items-center justify-between border-b border-gray-100 py-3">
              <View>
                <Text className="font-medium">
                  {categoryById.get(item.category_id) ?? "Sin categoría"}
                </Text>
                <Text className="text-gray-500">
                  {item.date}
                  {item.note ? ` · ${item.note}` : ""}
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Text
                  className={
                    item.type === "income"
                      ? "font-semibold text-green-600"
                      : "font-semibold text-red-600"
                  }
                >
                  {item.type === "income" ? "+" : "-"}
                  {formatCOP(item.amount)}
                </Text>
                <Pressable onPress={() => handleDelete(item)}>
                  <Text className="text-red-600">✕</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
