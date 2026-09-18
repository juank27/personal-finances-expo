import type { Category, Transaction } from "@finanzas/shared";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useColorScheme } from "nativewind";
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutLeft, LinearTransition } from "react-native-reanimated";

import { AmountText } from "@/components/amount-text";
import { CategoryBadge } from "@/components/category-badge";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/use-categories";
import {
  useDeleteTransaction,
  useTransactions,
  type TransactionFilters,
} from "@/hooks/use-transactions";
import { todayISODate } from "@/lib/date";
import { THEME_COLORS } from "@/lib/theme-colors";

type FilterValue = NonNullable<TransactionFilters["type"]> | "all";

const FILTER_OPTIONS: { label: string; value: FilterValue }[] = [
  { label: "Todos", value: "all" },
  { label: "Ingresos", value: "income" },
  { label: "Gastos", value: "expense" },
];

type Row = { kind: "header"; label: string } | { kind: "item"; transaction: Transaction };

function yesterdayISODate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateGroupLabel(dateStr: string): string {
  if (dateStr === todayISODate()) return "Hoy";
  if (dateStr === yesterdayISODate()) return "Ayer";
  const [year, month, day] = dateStr.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(
    new Date(year, month - 1, day)
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function TransactionsList() {
  const { colorScheme } = useColorScheme();
  const theme = THEME_COLORS[colorScheme ?? "light"];
  const [filter, setFilter] = useState<FilterValue>("all");
  const { data: categories } = useCategories();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isRefetching, refetch } =
    useTransactions({ type: filter === "all" ? undefined : filter });
  const deleteTransaction = useDeleteTransaction();
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories?.forEach((category) => map.set(category.id, category));
    return map;
  }, [categories]);

  const transactions = data?.pages.flatMap((page) => page.items) ?? [];

  const rows = useMemo<Row[]>(() => {
    const result: Row[] = [];
    let lastLabel: string | null = null;
    for (const transaction of transactions) {
      const label = dateGroupLabel(transaction.date);
      if (label !== lastLabel) {
        result.push({ kind: "header", label });
        lastLabel = label;
      }
      result.push({ kind: "item", transaction });
    }
    return result;
  }, [transactions]);

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteTransaction.mutate(pendingDelete.id);
    setPendingDelete(null);
  }

  return (
    <View className="flex-1 bg-background px-6 pt-4">
      <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} className="mb-4" />

      <Link href="/transaction/new" asChild>
        <Button title="+ Nueva transacción" className="mb-4" />
      </Link>

      {isLoading ? (
        <View className="gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </View>
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
            data={rows}
            keyExtractor={(row, index) =>
              row.kind === "header" ? `header-${row.label}-${index}` : row.transaction.id
            }
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
            renderItem={({ item: row, index }) => {
              if (row.kind === "header") {
                // Wrapped in Animated.View with the same `layout` as the item rows below —
                // mixing animated and non-animated direct children under LinearTransition
                // desyncs Reanimated's tracked layout from the real screen position, which
                // silently breaks touch hit-testing on rows near a header (the trash icon
                // looks like it's there but taps land on stale coordinates).
                return (
                  <Animated.View layout={LinearTransition}>
                    <Text className="mb-2 mt-1 text-xs font-semibold uppercase text-muted-foreground">
                      {row.label}
                    </Text>
                  </Animated.View>
                );
              }

              const transaction = row.transaction;
              const category = categoryById.get(transaction.category_id);
              return (
                <Animated.View
                  entering={FadeInDown.delay(Math.min(index, 8) * 40)}
                  exiting={FadeOutLeft}
                  layout={LinearTransition}
                >
                  <Card className="mb-2 flex-row items-center justify-between">
                    <Pressable
                      className="flex-1 flex-row items-center gap-3"
                      onPress={() => router.push(`/transaction/${transaction.id}`)}
                    >
                      <CategoryBadge categoryId={transaction.category_id} icon={category?.icon ?? null} />
                      <View className="flex-1">
                        <Text className="font-medium text-foreground" numberOfLines={1}>
                          {category?.name ?? "Sin categoría"}
                        </Text>
                        {transaction.note ? (
                          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                            {transaction.note}
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                    <View className="flex-row items-center gap-3">
                      <AmountText amount={transaction.amount} type={transaction.type} />
                      <Pressable hitSlop={12} onPress={() => setPendingDelete(transaction)}>
                        <Ionicons name="trash-outline" size={18} color={theme.track} />
                      </Pressable>
                    </View>
                  </Card>
                </Animated.View>
              );
            }}
          />
        </Animated.View>
      )}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar transacción</DialogTitle>
            <DialogDescription>¿Quieres eliminar este movimiento?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" title="Cancelar" onPress={() => setPendingDelete(null)} />
            <Button variant="destructive" title="Eliminar" onPress={confirmDelete} />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}
