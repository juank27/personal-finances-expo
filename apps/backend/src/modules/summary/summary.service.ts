import type { CategoryExpenseSummary, ExpenseSummary } from "@finanzas/shared";
import { sql } from "../../db";

// Builds a half-open [start, endExclusive) range from "YYYY-MM" using plain string
// arithmetic (no JS Date) so the server's local timezone never shifts the boundary.
function monthRange(month: string): { start: string; endExclusive: string } {
  const [year, monthNum] = month.split("-").map(Number);
  const start = `${year}-${String(monthNum).padStart(2, "0")}-01`;
  const endExclusive =
    monthNum === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;
  return { start, endExclusive };
}

export async function getExpenseSummary(userId: string, month: string): Promise<ExpenseSummary> {
  const { start, endExclusive } = monthRange(month);

  const rows = await sql<CategoryExpenseSummary[]>`
    SELECT category_id, type, SUM(amount) AS amount
    FROM transactions
    WHERE user_id = ${userId}
      AND group_id IS NULL
      AND date >= ${start}::date
      AND date < ${endExclusive}::date
    GROUP BY category_id, type
  `;

  const totalIncome = rows
    .filter((row) => row.type === "income")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const totalExpense = rows
    .filter((row) => row.type === "expense")
    .reduce((sum, row) => sum + Number(row.amount), 0);

  return {
    month,
    total_income: totalIncome.toFixed(2),
    total_expense: totalExpense.toFixed(2),
    by_category: rows,
  };
}
