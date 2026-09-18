import { Pie, PolarChart } from "victory-native";
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
}: BudgetRingProps) {
  const pct = limit > 0 ? Math.min(spent / limit, 1) : 0;
  const fillColor = getBudgetStatusColor(spent, limit);
  // Meter pattern: the empty track is a low-opacity tint of the same status color, not an
  // unrelated neutral gray — makes it read as "progress toward a limit" rather than a
  // generic 2-slice pie.
  const trackTint = `${fillColor}33`;

  const data = [
    { value: pct * 100, color: fillColor, label: "spent" },
    { value: 100 - pct * 100, color: trackTint, label: "track" },
  ];

  // Victory Native's innerRadius is a % of the ring's own radius (px-based `radius`/
  // `innerRadius` props existed on the old gifted-charts API, not this one).
  const innerRadiusPct = `${Math.round((innerRadius / radius) * 100)}%`;

  return (
    <View
      style={{
        width: radius * 2,
        height: radius * 2,
        backgroundColor: cardBackgroundColor,
        borderRadius: radius,
        position: "relative",
      }}
    >
      <PolarChart data={data} labelKey="label" valueKey="value" colorKey="color">
        <Pie.Chart innerRadius={innerRadiusPct} />
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
        <Text className="text-xs font-semibold text-foreground">{Math.round(pct * 100)}%</Text>
      </View>
    </View>
  );
}
