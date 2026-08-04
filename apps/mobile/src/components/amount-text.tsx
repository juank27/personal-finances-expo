import type { TransactionType } from "@finanzas/shared";
import { Text, type TextProps } from "react-native";

import { formatCOP } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface AmountTextProps extends Omit<TextProps, "children"> {
  amount: string | number;
  type?: TransactionType;
  showSign?: boolean;
}

export function AmountText({
  amount,
  type,
  showSign = true,
  className,
  style,
  ...props
}: AmountTextProps) {
  const sign = type === "income" ? "+" : type === "expense" ? "-" : "";
  const colorClass =
    type === "income" ? "text-success" : type === "expense" ? "text-danger" : "text-foreground";

  return (
    <Text
      className={cn("font-semibold", colorClass, className)}
      style={[{ fontVariant: ["tabular-nums"] }, style]}
      {...props}
    >
      {showSign ? sign : ""}
      {formatCOP(amount)}
    </Text>
  );
}
