import type { TransactionType } from "@finanzas/shared";

export interface DefaultCategorySeed {
  name: string;
  icon: string;
  type: TransactionType;
}

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategorySeed[] = [
  { name: "Alimentación", icon: "restaurant", type: "expense" },
  { name: "Transporte", icon: "car", type: "expense" },
  { name: "Vivienda", icon: "home", type: "expense" },
  { name: "Servicios", icon: "flash", type: "expense" },
  { name: "Salud", icon: "medkit", type: "expense" },
  { name: "Entretenimiento", icon: "film", type: "expense" },
  { name: "Educación", icon: "school", type: "expense" },
  { name: "Compras", icon: "bag", type: "expense" },
  { name: "Suscripciones", icon: "repeat", type: "expense" },
  { name: "Otros gastos", icon: "ellipsis-horizontal", type: "expense" },
];

export const DEFAULT_INCOME_CATEGORIES: DefaultCategorySeed[] = [
  { name: "Salario", icon: "cash", type: "income" },
  { name: "Freelance", icon: "briefcase", type: "income" },
  { name: "Inversiones", icon: "trending-up", type: "income" },
  { name: "Regalos", icon: "gift", type: "income" },
  { name: "Otros ingresos", icon: "ellipsis-horizontal", type: "income" },
];

export const DEFAULT_CATEGORIES: DefaultCategorySeed[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];
