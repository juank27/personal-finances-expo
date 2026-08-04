import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { Label } from "@/components/ui/label";

interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <View className="gap-1">
      <Label>{label}</Label>
      {children}
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
