import { View } from "react-native";

import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // 0-100
  className?: string;
  indicatorClassName?: string;
  indicatorColor?: string;
}

export function Progress({ value, className, indicatorClassName, indicatorColor }: ProgressProps) {
  const pct = Math.min(Math.max(value, 0), 100);

  return (
    <View className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}>
      <View
        className={cn("h-2 rounded-full bg-primary", indicatorClassName)}
        style={{ width: `${pct}%`, backgroundColor: indicatorColor }}
      />
    </View>
  );
}
