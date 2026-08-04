import type { Budget } from "@finanzas/shared";
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

export async function listBudgets(userId: string): Promise<BudgetWithProgress[]> {
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
    INSERT INTO budgets (user_id, category_id, amount_limit, period, start_date, end_date)
    VALUES (${userId}, ${input.category_id}, ${input.amount_limit}, ${input.period}, ${input.start_date}, ${input.end_date})
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
    SET amount_limit = COALESCE(${input.amount_limit ?? null}, amount_limit)
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
