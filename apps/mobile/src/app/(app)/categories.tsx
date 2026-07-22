import type { Category, TransactionType } from "@finanzas/shared";
import { createCategorySchema } from "@finanzas/validators";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Button } from "@/components/button";
import { useArchiveCategory, useCategories, useCreateCategory } from "@/hooks/use-categories";
import { useSession } from "@/lib/session";

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
  return (
    <View className="gap-2">
      <Text className="text-lg font-semibold">{title}</Text>
      {categories.length === 0 ? (
        <Text className="text-gray-500">Sin categorías todavía.</Text>
      ) : (
        categories.map((category) => (
          <View
            key={category.id}
            className="flex-row items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
          >
            <Text>{category.name}</Text>
            {category.user_id === userId ? (
              <Pressable onPress={() => onArchive(category.id)}>
                <Text className="text-red-600">Archivar</Text>
              </Pressable>
            ) : null}
          </View>
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

  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [error, setError] = useState<string | null>(null);

  function handleCreate() {
    const parsed = createCategorySchema.safeParse({ name, icon: icon || "pricetag", type });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setError(null);
    createCategory.mutate(parsed.data, {
      onSuccess: () => {
        setName("");
        setIcon("");
      },
      onError: (err) => setError(err instanceof Error ? err.message : "Error al crear"),
    });
  }

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
    <ScrollView className="flex-1 bg-white px-6 pt-6" contentContainerClassName="gap-6 pb-10">
      <Text className="text-2xl font-bold">Categorías</Text>

      {isLoading ? (
        <Text className="text-gray-500">Cargando…</Text>
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

      <View className="gap-2 border-t border-gray-200 pt-4">
        <Text className="text-lg font-semibold">Nueva categoría</Text>

        <View className="flex-row gap-2">
          <Pressable
            onPress={() => setType("expense")}
            className={`flex-1 rounded-lg border py-2 ${type === "expense" ? "border-black bg-black" : "border-gray-300"}`}
          >
            <Text className={`text-center ${type === "expense" ? "text-white" : "text-black"}`}>
              Gasto
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setType("income")}
            className={`flex-1 rounded-lg border py-2 ${type === "income" ? "border-black bg-black" : "border-gray-300"}`}
          >
            <Text className={`text-center ${type === "income" ? "text-white" : "text-black"}`}>
              Ingreso
            </Text>
          </Pressable>
        </View>

        <TextInput
          className="rounded-lg border border-gray-300 px-4 py-3"
          placeholder="Nombre"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          className="rounded-lg border border-gray-300 px-4 py-3"
          placeholder="Ícono (opcional, ej: pricetag)"
          value={icon}
          onChangeText={setIcon}
        />

        {error ? <Text className="text-red-600">{error}</Text> : null}

        <Button
          title="Agregar categoría"
          loading={createCategory.isPending}
          onPress={handleCreate}
        />
      </View>
    </ScrollView>
  );
}
