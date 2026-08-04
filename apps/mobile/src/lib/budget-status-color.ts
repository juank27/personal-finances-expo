export type BudgetStatus = "success" | "warning" | "danger";

const SUCCESS = "#10B981";
const WARNING = "#F59E0B";
const DANGER = "#EF4444";

export function getBudgetStatus(spent: number, limit: number): BudgetStatus {
  if (limit <= 0) return "success";
  const ratio = spent / limit;
  if (ratio > 1) return "danger";
  if (ratio >= 0.8) return "warning";
  return "success";
}

export function getBudgetStatusColor(spent: number, limit: number): string {
  const status = getBudgetStatus(spent, limit);
  if (status === "danger") return DANGER;
  if (status === "warning") return WARNING;
  return SUCCESS;
}
