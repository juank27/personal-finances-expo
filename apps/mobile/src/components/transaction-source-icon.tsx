import type { TransactionSource } from "@finanzas/shared";
import { Ionicons } from "@expo/vector-icons";

interface TransactionSourceIconProps {
  source: TransactionSource;
  color: string;
  size?: number;
}

// Small "auto-imported" indicator for rows created by the Gmail sync pipeline — the row
// stays tappable like any other transaction, this is informational only.
export function TransactionSourceIcon({ source, color, size = 12 }: TransactionSourceIconProps) {
  if (source !== "email-ai") return null;
  return <Ionicons name="mail-outline" size={size} color={color} />;
}
