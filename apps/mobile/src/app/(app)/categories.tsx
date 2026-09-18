import type { Category, TransactionType } from "@finanzas/shared";
import { createCategorySchema } from "@finanzas/validators";
import { Ionicons } from "@expo/vector-icons";
import { useForm } from "@tanstack/react-form";
import { useColorScheme } from "nativewind";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutRight, LinearTransition } from "react-native-reanimated";
import { z } from "zod";

import { CategoryBadge } from "@/components/category-badge";
import { FormField } from "@/components/form-field";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useArchiveCategory, useCategories, useCreateCategory } from "@/hooks/use-categories";
import { useSession } from "@/lib/session";

const TYPE_OPTIONS: { label: string; value: TransactionType }[] = [
  { label: "Gasto", value: "expense" },
  { label: "Ingreso", value: "income" },
];

// Raw hex mirrors of the `--danger` token (global.css) — Ionicons needs a color string,
// not a className, so this stays in sync by hand like theme-colors.ts already does.
const DANGER_ICON_COLOR = { light: "#EF4444", dark: "#F87171" } as const;

function CategorySection({
  title,
  categories,
  userId,
  onArchive,
}: {
  title: string;
  categories: Category[];
  userId?: string;
  onArchive: (id: string) => void;
}) {
  const { colorScheme } = useColorScheme();
  const dangerColor = DANGER_ICON_COLOR[colorScheme ?? "light"];

  return (
    <View className="gap-2">
      <Text className="text-lg font-semibold text-foreground">{title}</Text>
      {categories.length === 0 ? (
        <Text className="text-muted-foreground">Sin categorías todavía.</Text>
      ) : (
        categories.map((category, index) => (
          <Animated.View
            key={category.id}
            entering={FadeInDown.delay(Math.min(index, 8) * 40)}
            exiting={FadeOutRight}
            layout={LinearTransition}
          >
            <Card className="flex-row items-center gap-3">
              <CategoryBadge categoryId={category.id} icon={category.icon} size="sm" />
              <Text className="flex-1 text-foreground">{category.name}</Text>
              {category.user_id === userId ? (
                <Ionicons
                  name="archive-outline"
                  size={18}
                  color={dangerColor}
                  hitSlop={12}
                  onPress={() => onArchive(category.id)}
                />
              ) : null}
            </Card>
          </Animated.View>
        ))
      )}
    </View>
  );
}

export default function Categories() {
  const { session } = useSession();
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const archiveCategory = useArchiveCategory();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: "", icon: "", type: "expense" as TransactionType },
    onSubmit: async ({ value, formApi }) => {
      setFormError(null);
      try {
        const parsed = createCategorySchema.parse({
          name: value.name,
          icon: value.icon || "pricetag",
          type: value.type,
        });
        await createCategory.mutateAsync(parsed);
        formApi.reset();
      } catch (err) {
        setFormError(err instanceof z.ZodError ? err.issues[0].message : "Error al crear");
      }
    },
  });

  function handleArchive(id: string) {
    Alert.alert("Archivar categoría", "¿Quieres archivar esta categoría?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Archivar",
        style: "destructive",
        onPress: () => archiveCategory.mutate({ id, input: { archived: true } }),
      },
    ]);
  }

  const expense = categories?.filter((c) => c.type === "expense") ?? [];
  const income = categories?.filter((c) => c.type === "income") ?? [];

  return (
    <ScrollView className="flex-1 bg-background px-6 pt-6" contentContainerClassName="gap-6 pb-10">
      <Text className="text-2xl font-bold text-foreground">Categorías</Text>

      {isLoading ? (
        <Text className="text-muted-foreground">Cargando…</Text>
      ) : (
        <>
          <CategorySection
            title="Gastos"
            categories={expense}
            userId={session?.user.id}
            onArchive={handleArchive}
          />
          <CategorySection
            title="Ingresos"
            categories={income}
            userId={session?.user.id}
            onArchive={handleArchive}
          />
        </>
      )}

      <Card className="gap-3">
        <Text className="text-lg font-semibold text-foreground">Nueva categoría</Text>

        <form.Field name="type">
          {(field) => (
            <SegmentedControl
              options={TYPE_OPTIONS}
              value={field.state.value}
              onChange={field.handleChange}
            />
          )}
        </form.Field>

        <form.Field name="name">
          {(field) => (
            <FormField label="Nombre">
              <Input value={field.state.value} onChangeText={field.handleChange} />
            </FormField>
          )}
        </form.Field>

        <form.Field name="icon">
          {(field) => (
            <FormField label="Ícono (opcional, ej: pricetag)">
              <Input value={field.state.value} onChangeText={field.handleChange} />
            </FormField>
          )}
        </form.Field>

        {formError ? <Text className="text-danger">{formError}</Text> : null}

        <Button
          title="Agregar categoría"
          loading={createCategory.isPending}
          onPress={form.handleSubmit}
        />
      </Card>
    </ScrollView>
  );
}
