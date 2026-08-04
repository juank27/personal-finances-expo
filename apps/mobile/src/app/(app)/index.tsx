import type { Category } from "@finanzas/shared";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useColorScheme } from "nativewind";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

import { BudgetRing } from "@/components/budget-ring";
import { useBudgets } from "@/hooks/use-budgets";
import { useCategories } from "@/hooks/use-categories";
import { getCategoryColor } from "@/lib/category-colors";
import { formatCOP } from "@/lib/currency";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { THEME_COLORS } from "@/lib/theme-colors";

const QUICK_LINKS = [
  {
    href: "/transactions" as const,
    label: "Transacciones",
    icon: "swap-horizontal-outline" as const,
  },
  { href: "/budgets" as const, label: "Presupuestos", icon: "pie-chart-outline" as const },
  { href: "/categories" as const, label: "Categorías", icon: "pricetag-outline" as const },
];

export default function Home() {
  const { colorScheme } = useColorScheme();
  const theme = THEME_COLORS[colorScheme ?? "light"];
  const { session } = useSession();
  const { data: budgets } = useBudgets();
  const { data: categories } = useCategories();

  const categoryById = useMemo(() => {
    const map = new Map<string, Category>();
    categories?.forEach((category) => map.set(category.id, category));
    return map;
  }, [categories]);

  const byCategory = useMemo(() => {
    const totals = new Map<string, number>();
    budgets?.forEach((budget) => {
      totals.set(
        budget.category_id,
        (totals.get(budget.category_id) ?? 0) + Number(budget.spent)
      );
    });
    return [...totals.entries()]
      .filter(([, value]) => value > 0)
      .map(([categoryId, value]) => ({ value, color: getCategoryColor(categoryId) }));
  }, [budgets]);

  const totalSpent = byCategory.reduce((sum, item) => sum + item.value, 0);
  const greetingName = session?.user.email?.split("@")[0] ?? "";
  const hasBudgets = !!budgets && budgets.length > 0;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-6 px-6 pb-10 pt-6"
    >
      <Animated.View entering={FadeInDown} className="flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-foreground">Hola, {greetingName}</Text>
        <Ionicons
          name="log-out-outline"
          size={24}
          color={theme.track}
          onPress={() => supabase.auth.signOut()}
        />
      </Animated.View>

      {!hasBudgets ? (
        <Animated.View
          entering={FadeInDown.delay(100)}
          className="items-center gap-3 rounded-lg border border-border bg-card p-6"
        >
          <Ionicons name="pie-chart-outline" size={48} color={theme.track} />
          <Text className="text-center text-muted-foreground">
            Crea un presupuesto para ver tu resumen de gastos aquí.
          </Text>
          <Link href="/budgets/new" asChild>
            <Pressable className="rounded-lg bg-primary px-4 py-2">
              <Text className="font-semibold text-primary-foreground">Crear presupuesto</Text>
            </Pressable>
          </Link>
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeInDown.delay(100)}
          className="items-center gap-2 rounded-lg border border-border bg-card p-4"
        >
          <View style={{ width: 180, height: 180 }}>
            <PieChart
              data={byCategory}
              donut
              radius={90}
              innerRadius={60}
              innerCircleColor={theme.card}
              isAnimated
              animationDuration={800}
              centerLabelComponent={() => (
                <View className="items-center">
                  <Text className="text-xs text-muted-foreground">Gastado</Text>
                  <Text className="text-lg font-bold text-foreground">
                    {formatCOP(totalSpent)}
                  </Text>
                </View>
              )}
            />
          </View>
          <Text className="text-center text-xs text-muted-foreground">
            Basado en tus {budgets.length} presupuesto{budgets.length === 1 ? "" : "s"} activo
            {budgets.length === 1 ? "" : "s"}
          </Text>
        </Animated.View>
      )}

      {hasBudgets ? (
        <View className="gap-2">
          <Text className="text-lg font-semibold text-foreground">Tus presupuestos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 pr-4"
          >
            {budgets.map((budget, index) => {
              const category = categoryById.get(budget.category_id);
              return (
                <Link key={budget.id} href="/budgets" asChild>
                  <Pressable>
                    <Animated.View
                      entering={FadeInRight.delay(index * 80)}
                      className="items-center gap-2 rounded-lg border border-border bg-card p-3"
                    >
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
                    </Animated.View>
                  </Pressable>
                </Link>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View className="gap-2">
        {QUICK_LINKS.map((link, index) => (
          <Animated.View key={link.href} entering={FadeInDown.delay(200 + index * 60)}>
            <Link href={link.href} asChild>
              <Pressable className="flex-row items-center gap-3 rounded-lg border border-border bg-card p-4">
                <Ionicons name={link.icon} size={20} color="#6B7280" />
                <Text className="font-medium text-foreground">{link.label}</Text>
              </Pressable>
            </Link>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}
