import type { BudgetPeriod } from "@finanzas/shared";
import { useForm } from "@tanstack/react-form";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { z } from "zod";

import { CategoryBadge } from "@/components/category-badge";
import { CurrencyInput } from "@/components/currency-input";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useBudgets, useUpdateBudget, type BudgetWithProgress } from "@/hooks/use-budgets";
import { useCategories } from "@/hooks/use-categories";

const PERIOD_LABELS: Record<BudgetPeriod, string> = { monthly: "Mensual", weekly: "Semanal" };

const amountLimitFieldSchema = z
  .string()
  .refine((v) => Number(v) > 0, { message: "Debe ser un número positivo" });

function EditBudgetForm({ budget }: { budget: BudgetWithProgress }) {
  const { data: categories } = useCategories();
  const category = useMemo(
    () => categories?.find((c) => c.id === budget.category_id),
    [categories, budget.category_id]
  );
  const updateBudget = useUpdateBudget();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      // budget.amount_limit is a numeric-string like "500000.00" (Postgres numeric) — round
      // to a clean integer digit string, which is what CurrencyInput expects/produces.
      amount_limit: String(Math.round(Number(budget.amount_limit))),
      is_recurring: budget.is_recurring,
    },
    onSubmit: async ({ value }) => {
      setFormError(null);
      if (!(Number(value.amount_limit) > 0)) {
        setFormError("Debe ser un número positivo");
        return;
      }
      try {
        await updateBudget.mutateAsync({
          id: budget.id,
          input: {
            amount_limit: Number(value.amount_limit),
            is_recurring: value.is_recurring,
          },
        });
        router.back();
      } catch {
        setFormError("Error al guardar");
      }
    },
  });

  return (
    <ScrollView className="flex-1 bg-background px-6 pt-6" contentContainerClassName="gap-4 pb-10">
      <Card className="flex-row items-center gap-3">
        <CategoryBadge categoryId={budget.category_id} icon={category?.icon ?? null} />
        <View className="flex-1 gap-1">
          <Text className="font-medium text-foreground">{category?.name ?? "Sin categoría"}</Text>
          <Text className="text-xs text-muted-foreground">
            {PERIOD_LABELS[budget.period]} · {budget.start_date} a {budget.end_date}
          </Text>
        </View>
      </Card>

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

      <Button title="Guardar" loading={updateBudget.isPending} onPress={form.handleSubmit} />
    </ScrollView>
  );
}

export default function EditBudget() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: budgets, isLoading } = useBudgets();
  const budget = budgets?.find((b) => b.id === id);

  if (isLoading || !budget) {
    return (
      <ScrollView className="flex-1 bg-background px-6 pt-6" contentContainerClassName="gap-4 pb-10">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </ScrollView>
    );
  }

  return <EditBudgetForm budget={budget} />;
}
