import type { Category } from "@finanzas/shared";
import type { BankEmailExtraction } from "./email-extraction";

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function resolveEmailDate(emailDateHeader: string): string {
  const emailDate = new Date(emailDateHeader);
  return Number.isNaN(emailDate.getTime()) ? toISODate(new Date()) : toISODate(emailDate);
}

// Resolves the category_id to store on the transaction from Claude's extraction: never
// trust an LLM-returned uuid blindly — if it doesn't match a real category of this user,
// fall back to the default "Otros gastos"/"Otros ingresos" category. Shared by the lazy
// sync (checkAndSync) and the historical backfill (runBackfill) so the fallback rule can't
// drift between the two.
export function resolveCategoryId(
  categories: Category[],
  extraction: Pick<BankEmailExtraction, "category_id" | "type">
): string | null {
  if (extraction.category_id && categories.some((c) => c.id === extraction.category_id)) {
    return extraction.category_id;
  }

  const fallbackName = extraction.type === "expense" ? "Otros gastos" : "Otros ingresos";
  const fallback = categories.find((c) => c.is_default && c.name === fallbackName);
  return fallback?.id ?? null;
}
