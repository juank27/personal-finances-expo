import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { THEME_COLORS, type ThemeColorScheme } from "@/lib/theme-colors";

interface MonthSelectorProps {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  isNextDisabled?: boolean;
  isLoading?: boolean;
  colorScheme?: ThemeColorScheme;
}

export function MonthSelector({
  label,
  onPrevious,
  onNext,
  isNextDisabled = false,
  isLoading = false,
  colorScheme = "light",
}: MonthSelectorProps) {
  const theme = THEME_COLORS[colorScheme];

  return (
    <View className="flex-row items-center justify-between">
      <Pressable onPress={onPrevious} hitSlop={12} className="p-2">
        <Ionicons name="chevron-back" size={20} color={theme.foreground} />
      </Pressable>

      <View className="flex-row items-center gap-2">
        <Text className="text-base font-semibold text-foreground">{label}</Text>
        {isLoading ? <ActivityIndicator size="small" color={theme.foreground} /> : null}
      </View>

      <Pressable onPress={onNext} disabled={isNextDisabled} hitSlop={12} className="p-2">
        <Ionicons
          name="chevron-forward"
          size={20}
          color={isNextDisabled ? theme.track : theme.foreground}
        />
      </Pressable>
    </View>
  );
}
