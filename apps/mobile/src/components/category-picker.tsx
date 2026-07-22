import type { TransactionType } from "@finanzas/shared";
import { Pressable, ScrollView, Text } from "react-native";

import { useCategories } from "@/hooks/use-categories";

interface CategoryPickerProps {
  type: TransactionType;
  value: string | null;
  onChange: (categoryId: string) => void;
}

export function CategoryPicker({ type, value, onChange }: CategoryPickerProps) {
  const { data: categories, isLoading } = useCategories();
  const filtered = categories?.filter((category) => category.type === type) ?? [];

  if (isLoading) {
    return <Text className="text-gray-500">Cargando categorías…</Text>;
  }

  if (filtered.length === 0) {
    return <Text className="text-gray-500">No hay categorías de este tipo todavía.</Text>;
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
            className={`rounded-full border px-4 py-2 ${
              selected ? "border-black bg-black" : "border-gray-300 bg-white"
            }`}
          >
            <Text className={selected ? "text-white" : "text-black"}>{category.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
