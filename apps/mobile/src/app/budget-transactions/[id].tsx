import type { BudgetPeriod, Transaction } from "@finanzas/shared";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useColorScheme } from "nativewind";
import { useMemo } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";

import { AmountText } from "@/components/amount-text";
import { BudgetRing } from "@/components/budget-ring";
import { CategoryBadge } from "@/components/category-badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudgets } from "@/hooks/use-budgets";
import { useCategories } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { THEME_COLORS } from "@/lib/theme-colors";

const PERIOD_LABELS: Record<BudgetPeriod, string> = { monthly: "Mensual", weekly: "Semanal" };

export default function BudgetTransactions() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colorScheme } = useColorScheme();
  const theme = THEME_COLORS[colorScheme ?? "light"];
  const { data: budgets, isLoading: isBudgetLoading } = useBudgets();
  const { data: categories } = useCategories();
  const budget = budgets?.find((b) => b.id === id);

  const category = useMemo(
    () => categories?.find((c) => c.id === budget?.category_id),
    [categories, budget?.category_id]
  );

  const {
    data,
    isLoading: isTransactionsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTransactions(
    budget
      ? {
          category_id: budget.category_id,
          type: "expense",
          from: budget.start_date,
          to: budget.end_date,
        }
      : {}
  );
  const transactions = data?.pages.flatMap((page) => page.items) ?? [];

  if (isBudgetLoading || !budget) {
    return (
      <View className="flex-1 gap-3 bg-background px-6 pt-6">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </View>
    );
  }

  const spent = Number(budget.spent);
  const limit = Number(budget.amount_limit);

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Card className="mb-4 flex-row items-center gap-3">
        <BudgetRing
          spent={spent}
          limit={limit}
          radius={32}
          innerRadius={22}
          cardBackgroundColor={theme.card}
          trackColor={theme.track}
        />
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <CategoryBadge categoryId={budget.category_id} icon={category?.icon ?? null} size="sm" />
            <Text className="flex-1 font-medium text-foreground" numberOfLines={1}>
              {category?.name ?? "Sin categoría"}
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground">
            {PERIOD_LABELS[budget.period]} · {budget.start_date} a {budget.end_date}
          </Text>
          <View className="flex-row items-center gap-2">
            <AmountText amount={spent} showSign={false} className="text-sm" />
            <Text className="text-sm text-muted-foreground">de</Text>
            <AmountText amount={limit} showSign={false} className="text-sm" />
          </View>
        </View>
      </Card>

      <Text className="mb-2 text-lg font-semibold text-foreground">Transacciones</Text>

      {isTransactionsLoading ? (
        <View className="gap-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </View>
      ) : transactions.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3 pb-20">
          <Ionicons name="receipt-outline" size={48} color={theme.track} />
          <Text className="text-center text-muted-foreground">
            Todavía no hay gastos en esta categoría dentro de este período.
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <Text className="py-4 text-center text-muted-foreground">Cargando más…</Text>
            ) : null
          }
          renderItem={({ item, index }: { item: Transaction; index: number }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40)} layout={LinearTransition}>
              <Pressable onPress={() => router.push(`/transaction/${item.id}`)}>
                <Card className="mb-2 flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-xs text-muted-foreground">{item.date}</Text>
                    {item.note ? (
                      <Text className="font-medium text-foreground" numberOfLines={1}>
                        {item.note}
                      </Text>
                    ) : null}
                  </View>
                  <AmountText amount={item.amount} type={item.type} />
                </Card>
              </Pressable>
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}
