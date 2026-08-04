import type { TransactionType } from "@finanzas/shared";
import { Pressable, ScrollView, Text, View } from "react-native";

import { CategoryBadge } from "@/components/category-badge";
import { useCategories } from "@/hooks/use-categories";
import { cn } from "@/lib/utils";

interface CategoryPickerProps {
  type: TransactionType;
  value: string | null;
  onChange: (categoryId: string) => void;
}

export function CategoryPicker({ type, value, onChange }: CategoryPickerProps) {
  const { data: categories, isLoading } = useCategories();
  const filtered = categories?.filter((category) => category.type === type) ?? [];

  if (isLoading) {
    return <Text className="text-muted-foreground">Cargando categorías…</Text>;
  }

  if (filtered.length === 0) {
    return <Text className="text-muted-foreground">No hay categorías de este tipo todavía.</Text>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row gap-2 pr-4"
    >
      {filtered.map((category) => {
        const selected = category.id === value;
        return (
          <Pressable
            key={category.id}
            onPress={() => onChange(category.id)}
            className={cn(
              "flex-row items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4",
              selected ? "border-primary bg-primary/10" : "border-border bg-card"
            )}
          >
            <CategoryBadge categoryId={category.id} icon={category.icon} size="sm" />
            <Text className={cn(selected ? "font-semibold text-primary" : "text-foreground")}>
              {category.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
