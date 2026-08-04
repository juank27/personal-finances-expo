import { PieChart } from "react-native-gifted-charts";
import { Text, View } from "react-native";

import { getBudgetStatusColor } from "@/lib/budget-status-color";

interface BudgetRingProps {
  spent: number;
  limit: number;
  radius?: number;
  innerRadius?: number;
  cardBackgroundColor: string;
  trackColor: string;
}

export function BudgetRing({
  spent,
  limit,
  radius = 36,
  innerRadius = 26,
  cardBackgroundColor,
  trackColor,
}: BudgetRingProps) {
  const pct = limit > 0 ? Math.min(spent / limit, 1) : 0;
  const fillColor = getBudgetStatusColor(spent, limit);

  const data = [
    { value: pct * 100, color: fillColor },
    { value: 100 - pct * 100, color: trackColor },
  ];

  return (
    <View style={{ width: radius * 2, height: radius * 2 }}>
      <PieChart
        data={data}
        donut
        radius={radius}
        innerRadius={innerRadius}
        innerCircleColor={cardBackgroundColor}
        isAnimated
        animationDuration={600}
        centerLabelComponent={() => (
          <Text className="text-xs font-semibold text-foreground">{Math.round(pct * 100)}%</Text>
        )}
      />
    </View>
  );
}
