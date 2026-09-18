import type { TransactionType } from "@finanzas/shared";
import { createTransactionSchema } from "@finanzas/validators";
import { Ionicons } from "@expo/vector-icons";
import { useForm } from "@tanstack/react-form";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { z } from "zod";

import { CategoryPicker } from "@/components/category-picker";
import { FormField } from "@/components/form-field";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateTransaction } from "@/hooks/use-transactions";
import { todayISODate } from "@/lib/date";

const TYPE_OPTIONS: { label: string; value: TransactionType }[] = [
  { label: "Gasto", value: "expense" },
  { label: "Ingreso", value: "income" },
];

// Mirrors createTransactionSchema's coerced `amount` field but with a string input type, to
// stay compatible with a string-bound TextInput's onChange validator (see budgets/new.tsx).
const amountFieldSchema = z
  .string()
  .refine((v) => Number(v) > 0, { message: "Debe ser un número positivo" });

const dateFieldSchema = createTransactionSchema.shape.date;

export default function NewTransaction() {
  const createTransaction = useCreateTransaction();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      type: "expense" as TransactionType,
      category_id: "",
      amount: "",
      date: todayISODate(),
      note: "",
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      try {
        const parsed = createTransactionSchema.parse({
          category_id: value.category_id,
          amount: value.amount,
          type: value.type,
          date: value.date,
          note: value.note || undefined,
        });
        await createTransaction.mutateAsync(parsed);
        router.back();
      } catch (err) {
        setFormError(err instanceof z.ZodError ? err.issues[0].message : "Error al crear");
      }
    },
  });

  return (
    <ScrollView
      className="flex-1 bg-background px-6 pt-6"
      contentContainerClassName="gap-4 pb-10"
    >
      <form.Field name="type">
        {(field) => (
          <SegmentedControl
            options={TYPE_OPTIONS}
            value={field.state.value}
            onChange={(value) => {
              field.handleChange(value);
              form.setFieldValue("category_id", "");
            }}
          />
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.type}>
        {(type) => (
          <form.Field name="category_id">
            {(field) => (
              <FormField label="Categoría">
                <CategoryPicker
                  type={type}
                  value={field.state.value || null}
                  onChange={field.handleChange}
                />
              </FormField>
            )}
          </form.Field>
        )}
      </form.Subscribe>

      <form.Field name="amount" validators={{ onChange: amountFieldSchema }}>
        {(field) => (
          <FormField label="Monto (COP)" error={field.state.meta.errors[0]?.message}>
            <Input
              className="text-2xl font-bold"
              keyboardType="decimal-pad"
              placeholder="0"
              value={field.state.value}
              onChangeText={field.handleChange}
              onBlur={field.handleBlur}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="date" validators={{ onChange: dateFieldSchema }}>
        {(field) => (
          <FormField label="Fecha" error={field.state.meta.errors[0]?.message}>
            <View className="flex-row items-center gap-2">
              <Input
                className="flex-1"
                value={field.state.value}
                onChangeText={field.handleChange}
              />
              <Pressable
                className="rounded-lg border border-border bg-card p-3 active:opacity-70"
                onPress={() => field.handleChange(todayISODate())}
              >
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              </Pressable>
            </View>
          </FormField>
        )}
      </form.Field>

      <form.Field name="note">
        {(field) => (
          <FormField label="Nota (opcional)">
            <Input value={field.state.value} onChangeText={field.handleChange} />
          </FormField>
        )}
      </form.Field>

      {formError ? <Text className="text-danger">{formError}</Text> : null}

      <Button title="Guardar" loading={createTransaction.isPending} onPress={form.handleSubmit} />
    </ScrollView>
  );
}
