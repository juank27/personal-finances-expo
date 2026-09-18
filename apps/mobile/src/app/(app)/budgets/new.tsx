import type { BudgetPeriod } from "@finanzas/shared";
import { createBudgetSchema } from "@finanzas/validators";
import { Ionicons } from "@expo/vector-icons";
import { useForm } from "@tanstack/react-form";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { z } from "zod";

import { CategoryPicker } from "@/components/category-picker";
import { CurrencyInput } from "@/components/currency-input";
import { FormField } from "@/components/form-field";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useCreateBudget } from "@/hooks/use-budgets";
import { getCurrentPeriodRange } from "@/lib/date";

const PERIOD_OPTIONS: { label: string; value: BudgetPeriod }[] = [
  { label: "Mensual", value: "monthly" },
  { label: "Semanal", value: "weekly" },
];

// createBudgetSchema uses z.coerce.number() for amount_limit, whose Standard Schema input
// type is `number` — incompatible with a string-bound TextInput field's onChange validator.
// This string-typed mirror is only for inline UX feedback; the real createBudgetSchema.parse()
// at submit time (with coercion) remains the actual source of truth.
const amountLimitFieldSchema = z
  .string()
  .refine((v) => Number(v) > 0, { message: "Debe ser un número positivo" });

export default function NewBudget() {
  const createBudget = useCreateBudget();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      category_id: "",
      amount_limit: "",
      period: "monthly" as BudgetPeriod,
      is_recurring: true,
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      try {
        const range = getCurrentPeriodRange(value.period);
        const parsed = createBudgetSchema.parse({
          category_id: value.category_id,
          amount_limit: value.amount_limit,
          period: value.period,
          start_date: range.start_date,
          end_date: range.end_date,
          is_recurring: value.is_recurring,
        });
        await createBudget.mutateAsync(parsed);
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
      <form.Field name="category_id">
        {(field) => (
          <FormField label="Categoría">
            <CategoryPicker
              type="expense"
              value={field.state.value || null}
              onChange={field.handleChange}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="amount_limit" validators={{ onChange: amountLimitFieldSchema }}>
        {(field) => (
          <FormField label="Límite (COP)" error={field.state.meta.errors[0]?.message}>
            <CurrencyInput
              className="text-2xl font-bold"
              placeholder="0"
              value={field.state.value}
              onChangeValue={field.handleChange}
              onBlur={field.handleBlur}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="period">
        {(field) => (
          <FormField label="Período">
            <SegmentedControl
              options={PERIOD_OPTIONS}
              value={field.state.value}
              onChange={field.handleChange}
            />
          </FormField>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.period}>
        {(period) => {
          const range = getCurrentPeriodRange(period);
          return (
            <Card className="flex-row items-center gap-2 bg-muted">
              <Ionicons name="calendar-outline" size={18} color="#6B7280" />
              <Text className="text-sm text-muted-foreground">
                Del {range.start_date} al {range.end_date}
              </Text>
            </Card>
          );
        }}
      </form.Subscribe>

      <form.Field name="is_recurring">
        {(field) => (
          <Card className="flex-row items-center justify-between gap-3">
            <View className="flex-1 gap-1">
              <Text className="font-medium text-foreground">Renovar automáticamente</Text>
              <Text className="text-xs text-muted-foreground">
                Se creará solo el siguiente período cuando este termine, con el mismo límite.
              </Text>
            </View>
            <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
          </Card>
        )}
      </form.Field>

      {formError ? <Text className="text-danger">{formError}</Text> : null}

      <Button title="Guardar" loading={createBudget.isPending} onPress={form.handleSubmit} />
    </ScrollView>
  );
}
