import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { digitsOnly, formatDigitsWithThousands } from "@/lib/currency";

interface CurrencyInputProps
  extends Omit<ComponentProps<typeof Input>, "value" | "onChangeText" | "keyboardType"> {
  /** Raw digits only (no separators) — this is what the form field actually stores/submits. */
  value: string;
  onChangeValue: (digits: string) => void;
}

// Displays "." thousands grouping while typing (e.g. "15000" -> "15.000") without ever
// storing separators in the field's own value, so the existing amount validators/schemas
// (which expect a plain numeric string) don't need to change.
export function CurrencyInput({ value, onChangeValue, ...props }: CurrencyInputProps) {
  return (
    <Input
      keyboardType="number-pad"
      value={formatDigitsWithThousands(value)}
      onChangeText={(text) => onChangeValue(digitsOnly(text))}
      {...props}
    />
  );
}
