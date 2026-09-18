import type { Category } from "@finanzas/shared";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useColorScheme } from "nativewind";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInDown, FadeInRight, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { AmountText } from "@/components/amount-text";
import { BudgetRing } from "@/components/budget-ring";
import { CategoryBadge } from "@/components/category-badge";
import { CategoryBreakdownChart } from "@/components/charts/category-breakdown-chart";
import { MonthSelector } from "@/components/month-selector";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useBudgets } from "@/hooks/use-budgets";
import { useCategories } from "@/hooks/use-categories";
import { useExpenseSummary } from "@/hooks/use-expense-summary";
import { useTransactions } from "@/hooks/use-transactions";
import { getCategoryColor } from "@/lib/category-colors";
import { addMonths, currentMonthString, formatMonthLabel } from "@/lib/date";
import { useSession } from "@/lib/session";
import { THEME_COLORS } from "@/lib/theme-colors";

const RECENT_EXPENSES_LIMIT = 5;

export default function Home() {
  const { colorScheme } = useColorScheme();
  const theme = THEME_COLORS[colorScheme ?? "light"];
  const { session } = useSession();
  const [selectedMonth, setSelectedMonth] = useState(() => currentMonthString());
  const { data: budgets } = useBudgets();
  const { data: categories } = useCategories();
  const { data: summary, isFetching: isSummaryFetching } = useExpenseSummary(selectedMonth);
  const { data: recentExpensesData, isLoading: isRecentExpensesLoading } = useTransactions({
    type: "expense",
  });
  const recentExpenses = (recentExpensesData?.pages[0]?.items ?? []).slice(
    0,
    RECENT_EXPENSES_LIMIT
  );

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories?.forEach((category) => map.set(category.id, category));
    return map;
  }, [categories]);

  const breakdownItems = useMemo(() => {
    return (summary?.by_category ?? [])
      .filter((row) => row.type === "expense" && Number(row.amount) > 0)
      .map((row) => {
        const category = categoryById.get(row.category_id);
        return {
          categoryId: row.category_id,
          label: category?.name ?? "Sin categoría",
          icon: category?.icon ?? null,
          value: Number(row.amount),
          color: getCategoryColor(row.category_id, colorScheme ?? "light"),
        };
      });
  }, [summary, categoryById, colorScheme]);

  const totalSpent = Number(summary?.total_expense ?? 0);
  const greetingName = session?.user.email?.split("@")[0] ?? "";
  const hasExpenses = totalSpent > 0;

  // "Tus presupuestos" only makes sense for the month currently being viewed — budgets
  // from other periods stay visible in the full history on the Presupuestos tab instead.
  const budgetsForSelectedMonth = useMemo(() => {
    return (budgets ?? []).filter(
      (budget) =>
        budget.start_date.slice(0, 7) <= selectedMonth && budget.end_date.slice(0, 7) >= selectedMonth
    );
  }, [budgets, selectedMonth]);
  const hasBudgets = budgetsForSelectedMonth.length > 0;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-6 pb-24 pt-6"
      >
      <Animated.View entering={FadeInDown}>
        <Text className="text-2xl font-bold text-foreground">Hola, {greetingName}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60)} className="gap-4">
        <MonthSelector
          label={formatMonthLabel(selectedMonth)}
          onPrevious={() => setSelectedMonth((m) => addMonths(m, -1))}
          onNext={() => setSelectedMonth((m) => addMonths(m, 1))}
          isNextDisabled={selectedMonth === currentMonthString()}
          isLoading={isSummaryFetching}
          colorScheme={colorScheme ?? "light"}
        />

        {!hasExpenses && !isSummaryFetching ? (
          <Card className="items-center gap-3 p-6">
            <Ionicons name="pie-chart-outline" size={48} color={theme.track} />
            <Text className="text-center text-muted-foreground">
              Registra un gasto para ver tu resumen aquí.
            </Text>
            <Link href="/transactions/new" asChild>
              <Pressable className="rounded-lg bg-primary px-4 py-2">
                <Text className="font-semibold text-primary-foreground">Registrar gasto</Text>
              </Pressable>
            </Link>
          </Card>
        ) : (
          <Card>
            <CategoryBreakdownChart
              items={breakdownItems}
              total={totalSpent}
              isLoading={isSummaryFetching && !summary}
              colorScheme={colorScheme ?? "light"}
            />
          </Card>
        )}
      </Animated.View>

      {hasBudgets ? (
        <View className="gap-2">
          <Text className="text-lg font-semibold text-foreground">Tus presupuestos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 pr-4"
          >
            {budgetsForSelectedMonth.map((budget, index) => {
              const category = categoryById.get(budget.category_id);
              return (
                <Link key={budget.id} href="/budgets" asChild>
                  <Pressable>
                    <Animated.View entering={FadeInRight.delay(index * 80)}>
                      <Card className="items-center gap-2 p-3">
                        <BudgetRing
                          spent={Number(budget.spent)}
                          limit={Number(budget.amount_limit)}
                          radius={32}
                          innerRadius={22}
                          cardBackgroundColor={theme.card}
                          trackColor={theme.track}
                        />
                        <Text
                          className="max-w-[80px] text-center text-xs text-foreground"
                          numberOfLines={1}
                        >
                          {category?.name ?? "—"}
                        </Text>
                      </Card>
                    </Animated.View>
                  </Pressable>
                </Link>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {isRecentExpensesLoading ? (
        <View className="gap-2">
          <Text className="text-lg font-semibold text-foreground">Últimos gastos</Text>
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </View>
      ) : recentExpenses.length > 0 ? (
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">Últimos gastos</Text>
            <Link href="/transactions" className="text-sm text-primary">
              Ver todas
            </Link>
          </View>
          {recentExpenses.map((transaction, index) => {
            const category = categoryById.get(transaction.category_id);
            return (
              <Animated.View
                key={transaction.id}
                entering={FadeInDown.delay(200 + index * 60)}
              >
                <Card className="flex-row items-center gap-3 p-4">
                  <CategoryBadge categoryId={transaction.category_id} icon={category?.icon ?? null} />
                  <View className="flex-1">
                    <Text className="font-medium text-foreground" numberOfLines={1}>
                      {category?.name ?? "Sin categoría"}
                    </Text>
                    <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                      {transaction.date}
                      {transaction.note ? ` · ${transaction.note}` : ""}
                    </Text>
                  </View>
                  <AmountText amount={transaction.amount} type={transaction.type} />
                </Card>
              </Animated.View>
            );
          })}
        </View>
      ) : null}
      </ScrollView>

      <Animated.View entering={ZoomIn.delay(300)} className="absolute bottom-6 right-6">
        <Link href="/transactions/new" asChild>
          <Pressable
            className="h-14 w-14 items-center justify-center rounded-full bg-primary active:opacity-80"
            style={{
              elevation: 4,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
            }}
            accessibilityLabel="Nueva transacción"
          >
            <Ionicons name="add" size={28} color={theme.primaryForeground} />
          </Pressable>
        </Link>
      </Animated.View>
    </SafeAreaView>
  );
}
