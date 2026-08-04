import type { Category, Transaction } from "@finanzas/shared";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useColorScheme } from "nativewind";
import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutLeft, LinearTransition } from "react-native-reanimated";

import { AmountText } from "@/components/amount-text";
import { CategoryBadge } from "@/components/category-badge";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/hooks/use-categories";
import {
  useDeleteTransaction,
  useTransactions,
  type TransactionFilters,
} from "@/hooks/use-transactions";
import { THEME_COLORS } from "@/lib/theme-colors";

type FilterValue = NonNullable<TransactionFilters["type"]> | "all";

const FILTER_OPTIONS: { label: string; value: FilterValue }[] = [
  { label: "Todos", value: "all" },
  { label: "Ingresos", value: "income" },
  { label: "Gastos", value: "expense" },
];

export default function TransactionsList() {
  const { colorScheme } = useColorScheme();
  const theme = THEME_COLORS[colorScheme ?? "light"];
  const [filter, setFilter] = useState<FilterValue>("all");
  const { data: categories } = useCategories();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isRefetching, refetch } =
    useTransactions({ type: filter === "all" ? undefined : filter });
  const deleteTransaction = useDeleteTransaction();

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories?.forEach((category) => map.set(category.id, category));
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
    <View className="flex-1 bg-background px-6 pt-4">
      <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} className="mb-4" />

      <Link href="/transactions/new" asChild>
        <Button title="+ Nueva transacción" className="mb-4" />
      </Link>

      {isLoading ? (
        <Text className="text-muted-foreground">Cargando…</Text>
      ) : transactions.length === 0 ? (
        <Animated.View
          entering={FadeInDown}
          className="flex-1 items-center justify-center gap-3 pb-20"
        >
          <Ionicons name="receipt-outline" size={56} color={theme.track} />
          <Text className="text-lg font-semibold text-foreground">
            No hay transacciones todavía
          </Text>
          <Text className="text-center text-muted-foreground">
            Registra tu primer ingreso o gasto para empezar.
          </Text>
        </Animated.View>
      ) : (
        <Animated.View layout={LinearTransition} className="flex-1">
          <FlatList
            data={transactions}
            keyExtractor={(item) => item.id}
            onEndReached={() => hasNextPage && fetchNextPage()}
            onEndReachedThreshold={0.4}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <Text className="py-4 text-center text-muted-foreground">Cargando más…</Text>
              ) : null
            }
            renderItem={({ item, index }) => {
              const category = categoryById.get(item.category_id);
              return (
                <Animated.View
                  entering={FadeInDown.delay(Math.min(index, 8) * 40)}
                  exiting={FadeOutLeft}
                  layout={LinearTransition}
                  className="flex-row items-center justify-between border-b border-border py-3"
                >
                  <View className="flex-1 flex-row items-center gap-3">
                    <CategoryBadge categoryId={item.category_id} icon={category?.icon ?? null} />
                    <View className="flex-1">
                      <Text className="font-medium text-foreground" numberOfLines={1}>
                        {category?.name ?? "Sin categoría"}
                      </Text>
                      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                        {item.date}
                        {item.note ? ` · ${item.note}` : ""}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <AmountText amount={item.amount} type={item.type} />
                    <Pressable onPress={() => handleDelete(item)}>
                      <Ionicons name="trash-outline" size={18} color={theme.track} />
                    </Pressable>
                  </View>
                </Animated.View>
              );
            }}
          />
        </Animated.View>
      )}
    </View>
  );
}
