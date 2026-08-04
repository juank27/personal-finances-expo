import { useColorScheme } from "nativewind";
import { forwardRef } from "react";
import { TextInput, type TextInputProps } from "react-native";

import { cn } from "@/lib/utils";

const PLACEHOLDER_COLOR = { light: "#9CA3AF", dark: "#71717A" };

export const Input = forwardRef<TextInput, TextInputProps>(({ className, ...props }, ref) => {
  const { colorScheme } = useColorScheme();

  return (
    <TextInput
      ref={ref}
      className={cn(
        "rounded-lg border border-border bg-card px-4 py-3 text-foreground",
        className
      )}
      placeholderTextColor={PLACEHOLDER_COLOR[colorScheme ?? "light"]}
      {...props}
    />
  );
});
Input.displayName = "Input";
