import { useMemo } from "react";
import { View } from "react-native";
import { Pie, PolarChart } from "victory-native";

import { CategoryBadge } from "@/components/category-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { formatCOPCompact } from "@/lib/currency";
import { THEME_COLORS, type ThemeColorScheme } from "@/lib/theme-colors";

const TOP_N = 6;
const OTHERS_COLOR = "#9CA3AF";

export interface CategoryBreakdownItem {
  categoryId: string;
  label: string;
  value: number;
  icon: string | null;
  color: string;
}

interface RankedItem {
  categoryId: string;
  label: string;
  value: number;
  icon: string | null;
  color: string;
}

interface CategoryBreakdownChartProps {
  items: CategoryBreakdownItem[];
  total: number;
  isLoading?: boolean;
  colorScheme?: ThemeColorScheme;
}

export function CategoryBreakdownChart({
  items,
  total,
  isLoading = false,
  colorScheme = "light",
}: CategoryBreakdownChartProps) {
  const theme = THEME_COLORS[colorScheme];

  const ranked = useMemo<RankedItem[]>(() => {
    const sorted = [...items].sort((a, b) => b.value - a.value);
    if (sorted.length <= TOP_N) return sorted;

    const top = sorted.slice(0, TOP_N);
    const othersValue = sorted.slice(TOP_N).reduce((sum, item) => sum + item.value, 0);
    return [
      ...top,
      { categoryId: "__others__", label: "Otros", value: othersValue, icon: null, color: OTHERS_COLOR },
    ];
  }, [items]);

  if (isLoading) {
    return (
      <View className="w-full items-center gap-4">
        <Skeleton className="h-[180px] w-[180px] rounded-full" />
        <View className="w-full gap-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </View>
      </View>
    );
  }

  const pieData = ranked.map((item) => ({
    value: item.value,
    color: item.color,
    label: item.label,
  }));

  return (
    <View className="w-full gap-4">
      <View className="items-center">
        <View
          style={{
            width: 180,
            height: 180,
            backgroundColor: theme.card,
            borderRadius: 90,
            position: "relative",
          }}
        >
          <PolarChart data={pieData} labelKey="label" valueKey="value" colorKey="color">
            <Pie.Chart innerRadius="67%" />
          </PolarChart>
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
            pointerEvents="none"
          >
            <Text className="text-xs text-muted-foreground">Gastado</Text>
            <Text className="text-3xl font-bold text-foreground">{formatCOPCompact(total)}</Text>
          </View>
        </View>
      </View>

      <View className="gap-1">
        {ranked.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <View key={item.categoryId} className="flex-row items-center gap-3 py-1.5">
              {item.categoryId === "__others__" ? (
                <View
                  className="items-center justify-center rounded-full"
                  style={{ width: 28, height: 28, backgroundColor: item.color }}
                />
              ) : (
                <CategoryBadge categoryId={item.categoryId} icon={item.icon} size="sm" />
              )}
              <Text className="flex-1 font-medium text-foreground" numberOfLines={1}>
                {item.label}
              </Text>
              <Text className="text-xs text-muted-foreground">{pct}%</Text>
              <Text className="text-sm font-semibold text-foreground">
                {formatCOPCompact(item.value)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
