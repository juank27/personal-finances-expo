import type { Budget, BudgetPeriod } from "@finanzas/shared";
import type { CreateBudgetInput, UpdateBudgetInput } from "@finanzas/validators";
import { sql } from "../../db";
import { HttpError } from "../../middleware/error-handler";

export interface BudgetWithProgress extends Budget {
  spent: string;
}

function assertNoGroup(groupId: string | null | undefined) {
  if (groupId) {
    throw new HttpError(400, "Group budgets are not supported yet", "not_implemented");
  }
}

// Builds today's period range as plain "YYYY-MM-DD" strings (no `.toISOString()`) so the
// server's local timezone never shifts the boundary — same rationale as `monthRange()` in
// summary.service.ts and the date-type fix in db.ts.
function currentPeriodRange(period: BudgetPeriod): { start_date: string; end_date: string } {
  const now = new Date();
  const toISODate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  if (period === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start_date: toISODate(start), end_date: toISODate(end) };
  }

  // weekly: Monday–Sunday of the current week
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { start_date: toISODate(start), end_date: toISODate(end) };
}

// Lazily rolls recurring budgets forward: for each category's most recent recurring row
// whose period has already ended, insert the current period's row (same category/limit),
// skipping straight to now rather than backfilling every missed period in between. Runs on
// every `listBudgets` call instead of a cron, since this dev server isn't guaranteed to be
// running when a period boundary rolls over.
async function rollForwardRecurringBudgets(userId: string): Promise<void> {
  const latestRecurring = await sql<Budget[]>`
    SELECT DISTINCT ON (category_id) *
    FROM budgets
    WHERE user_id = ${userId} AND is_recurring = true AND group_id IS NULL
    ORDER BY category_id, start_date DESC
  `;

  for (const budget of latestRecurring) {
    const range = currentPeriodRange(budget.period);
    if (budget.end_date >= range.start_date) continue;

    await sql`
      INSERT INTO budgets (user_id, category_id, amount_limit, period, start_date, end_date, is_recurring)
      SELECT ${userId}, ${budget.category_id}, ${budget.amount_limit}, ${budget.period}, ${range.start_date}, ${range.end_date}, true
      WHERE NOT EXISTS (
        SELECT 1 FROM budgets
        WHERE user_id = ${userId} AND category_id = ${budget.category_id} AND start_date = ${range.start_date}
      )
    `;
  }
}

export async function listBudgets(userId: string): Promise<BudgetWithProgress[]> {
  await rollForwardRecurringBudgets(userId);

  return sql<BudgetWithProgress[]>`
    SELECT
      b.*,
      COALESCE(SUM(t.amount) FILTER (
        WHERE t.type = 'expense' AND t.date BETWEEN b.start_date AND b.end_date
      ), 0) AS spent
    FROM budgets b
    LEFT JOIN transactions t
      ON t.category_id = b.category_id
      AND t.user_id = b.user_id
      AND t.group_id IS NULL
    WHERE b.user_id = ${userId} AND b.group_id IS NULL
    GROUP BY b.id
    ORDER BY b.start_date DESC
  `;
}

export async function createBudget(userId: string, input: CreateBudgetInput): Promise<Budget> {
  assertNoGroup(input.group_id);

  const [budget] = await sql<Budget[]>`
    INSERT INTO budgets (user_id, category_id, amount_limit, period, start_date, end_date, is_recurring)
    VALUES (${userId}, ${input.category_id}, ${input.amount_limit}, ${input.period}, ${input.start_date}, ${input.end_date}, ${input.is_recurring})
    RETURNING *
  `;
  return budget;
}

export async function updateBudget(
  userId: string,
  budgetId: string,
  input: UpdateBudgetInput
): Promise<Budget> {
  const [budget] = await sql<Budget[]>`
    UPDATE budgets
    SET
      amount_limit = COALESCE(${input.amount_limit ?? null}, amount_limit),
      is_recurring = COALESCE(${input.is_recurring ?? null}::boolean, is_recurring)
    WHERE id = ${budgetId} AND user_id = ${userId} AND group_id IS NULL
    RETURNING *
  `;

  if (!budget) {
    throw new HttpError(404, "Budget not found", "not_found");
  }

  return budget;
}

export async function deleteBudget(userId: string, budgetId: string): Promise<void> {
  const result = await sql`
    DELETE FROM budgets
    WHERE id = ${budgetId} AND user_id = ${userId} AND group_id IS NULL
  `;

  if (result.count === 0) {
    throw new HttpError(404, "Budget not found", "not_found");
  }
}
