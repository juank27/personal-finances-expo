import type { Category } from "@finanzas/shared";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useColorScheme } from "nativewind";
import { useMemo } from "react";
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutLeft, LinearTransition, ZoomIn } from "react-native-reanimated";

import { AmountText } from "@/components/amount-text";
import { BudgetRing } from "@/components/budget-ring";
import { CategoryBadge } from "@/components/category-badge";
import { Button } from "@/components/ui/button";
import { useBudgets, useDeleteBudget, type BudgetWithProgress } from "@/hooks/use-budgets";
import { useCategories } from "@/hooks/use-categories";
import { THEME_COLORS } from "@/lib/theme-colors";

const PERIOD_LABELS = { monthly: "Mensual", weekly: "Semanal" } as const;

export default function BudgetsList() {
  const { colorScheme } = useColorScheme();
  const theme = THEME_COLORS[colorScheme ?? "light"];
  const { data: categories } = useCategories();
  const { data: budgets, isLoading, isRefetching, refetch } = useBudgets();
  const deleteBudget = useDeleteBudget();

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories?.forEach((category) => map.set(category.id, category));
    return map;
  }, [categories]);

  function handleDelete(budget: BudgetWithProgress) {
    Alert.alert("Eliminar presupuesto", "¿Quieres eliminar este presupuesto?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => deleteBudget.mutate(budget.id) },
    ]);
  }

  return (
    <View className="flex-1 bg-background px-6 pt-4">
      <Link href="/budgets/new" asChild>
        <Button title="+ Nuevo presupuesto" className="mb-4" />
      </Link>

      {isLoading ? (
        <Text className="text-muted-foreground">Cargando…</Text>
      ) : !budgets || budgets.length === 0 ? (
        <Animated.View entering={FadeInUp} className="flex-1 items-center justify-center gap-3 pb-20">
          <Ionicons name="pie-chart-outline" size={56} color={theme.track} />
          <Text className="text-lg font-semibold text-foreground">Sin presupuestos todavía</Text>
          <Text className="text-center text-muted-foreground">
            Crea uno para ver cuánto llevas gastado en cada categoría.
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          data={budgets}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />
          }
          renderItem={({ item, index }) => {
            const spent = Number(item.spent);
            const limit = Number(item.amount_limit);
            const overBudget = spent > limit;
            const category = categoryById.get(item.category_id);

            return (
              <Animated.View
                entering={FadeInUp.delay(Math.min(index, 8) * 60)}
                exiting={FadeOutLeft}
                layout={LinearTransition}
                className="mb-4 flex-row items-center gap-3 rounded-lg border border-border bg-card p-4"
              >
                <BudgetRing
                  spent={spent}
                  limit={limit}
                  cardBackgroundColor={theme.card}
                  trackColor={theme.track}
                />

                <View className="flex-1 gap-1">
                  <View className="flex-row items-center gap-2">
                    <CategoryBadge
                      categoryId={item.category_id}
                      icon={category?.icon ?? null}
                      size="sm"
                    />
                    <Text className="flex-1 font-medium text-foreground" numberOfLines={1}>
                      {category?.name ?? "Sin categoría"}
                    </Text>
                    <Pressable onPress={() => handleDelete(item)}>
                      <Ionicons name="trash-outline" size={18} color={theme.track} />
                    </Pressable>
                  </View>
                  <Text className="text-xs text-muted-foreground">
                    {PERIOD_LABELS[item.period]} · {item.start_date} a {item.end_date}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <AmountText amount={spent} showSign={false} className="text-sm" />
                    <Text className="text-sm text-muted-foreground">de</Text>
                    <AmountText amount={limit} showSign={false} className="text-sm" />
                    {overBudget ? (
                      <Animated.View
                        entering={ZoomIn}
                        className="rounded-full bg-danger px-2 py-0.5"
                      >
                        <Text className="text-xs font-semibold text-danger-foreground">
                          ¡Excedido!
                        </Text>
                      </Animated.View>
                    ) : null}
                  </View>
                </View>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}
