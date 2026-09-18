import type { Category } from "@finanzas/shared";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useColorScheme } from "nativewind";
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutLeft, LinearTransition, ZoomIn } from "react-native-reanimated";

import { AmountText } from "@/components/amount-text";
import { BudgetRing } from "@/components/budget-ring";
import { CategoryBadge } from "@/components/category-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [pendingDelete, setPendingDelete] = useState<BudgetWithProgress | null>(null);

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories?.forEach((category) => map.set(category.id, category));
    return map;
  }, [categories]);

  function confirmDelete() {
    if (!pendingDelete) return;
    deleteBudget.mutate(pendingDelete.id);
    setPendingDelete(null);
  }

  return (
    <View className="flex-1 bg-background px-6 pt-4">
      <Link href="/budgets/new" asChild>
        <Button title="+ Nuevo presupuesto" className="mb-4" />
      </Link>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Quieres eliminar este presupuesto?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" title="Cancelar" onPress={() => setPendingDelete(null)} />
            <Button variant="destructive" title="Eliminar" onPress={confirmDelete} />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <View className="gap-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </View>
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
                className="mb-4"
              >
                <Card className="flex-row items-center gap-3">
                  <Pressable
                    className="flex-1 flex-row items-center gap-3"
                    onPress={() => router.push(`/budgets/${item.id}`)}
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
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Text className="text-xs text-muted-foreground">
                          {PERIOD_LABELS[item.period]} · {item.start_date} a {item.end_date}
                        </Text>
                        {item.is_recurring ? (
                          <Ionicons name="sync-outline" size={12} color={theme.track} />
                        ) : null}
                      </View>
                      <View className="flex-row items-center gap-2">
                        <AmountText amount={spent} showSign={false} className="text-sm" />
                        <Text className="text-sm text-muted-foreground">de</Text>
                        <AmountText amount={limit} showSign={false} className="text-sm" />
                        {overBudget ? (
                          <Animated.View entering={ZoomIn}>
                            <Badge variant="destructive">
                              <Text className="text-xs font-semibold text-white">¡Excedido!</Text>
                            </Badge>
                          </Animated.View>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                  <Pressable onPress={() => setPendingDelete(item)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={theme.track} />
                  </Pressable>
                </Card>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}
