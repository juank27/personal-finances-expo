import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { View } from "react-native";

import { getCategoryColor } from "@/lib/category-colors";

const SIZES = {
  sm: { box: 28, icon: 14 },
  md: { box: 36, icon: 18 },
  lg: { box: 48, icon: 24 },
} as const;

type IoniconName = keyof typeof Ionicons.glyphMap;

interface CategoryBadgeProps {
  categoryId: string;
  icon: string | null;
  size?: keyof typeof SIZES;
}

export function CategoryBadge({ categoryId, icon, size = "md" }: CategoryBadgeProps) {
  const { colorScheme } = useColorScheme();
  const color = getCategoryColor(categoryId, colorScheme ?? "light");
  const { box, icon: iconSize } = SIZES[size];
  const iconName: IoniconName =
    icon && icon in Ionicons.glyphMap ? (icon as IoniconName) : "pricetag";

  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: box, height: box, backgroundColor: color }}
    >
      <Ionicons name={iconName} size={iconSize} color="white" />
    </View>
  );
}
