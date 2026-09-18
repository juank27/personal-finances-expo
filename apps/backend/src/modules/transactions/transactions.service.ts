import type { Paginated, Transaction } from "@finanzas/shared";
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  PaginationQuery,
  UpdateTransactionInput,
} from "@finanzas/validators";
import { sql } from "../../db";
import { decodeCursor, encodeCursor } from "../../lib/cursor";
import { HttpError } from "../../middleware/error-handler";

// Group transactions land in Fase 4 once group membership authorization exists.
// Reject group_id for now instead of silently ignoring it.
function assertNoGroup(groupId: string | null | undefined) {
  if (groupId) {
    throw new HttpError(400, "Group transactions are not supported yet", "not_implemented");
  }
}

export async function listTransactions(
  userId: string,
  filters: ListTransactionsQuery,
  pagination: PaginationQuery
): Promise<Paginated<Transaction>> {
  assertNoGroup(filters.group_id);
  const cursor = decodeCursor(pagination.cursor);

  const rows = await sql<Transaction[]>`
    SELECT * FROM transactions
    WHERE user_id = ${userId}
      AND group_id IS NULL
      AND (${filters.category_id ?? null}::uuid IS NULL OR category_id = ${filters.category_id ?? null})
      AND (${filters.type ?? null}::text IS NULL OR type = ${filters.type ?? null})
      AND (${filters.from ?? null}::date IS NULL OR date >= ${filters.from ?? null})
      AND (${filters.to ?? null}::date IS NULL OR date <= ${filters.to ?? null})
      AND (
        ${cursor === null} OR
        (date, created_at) < (${cursor?.date ?? null}::date, ${cursor?.created_at ?? null}::timestamptz)
      )
    ORDER BY date DESC, created_at DESC
    LIMIT ${pagination.limit + 1}
  `;

  const hasMore = rows.length > pagination.limit;
  const items = hasMore ? rows.slice(0, pagination.limit) : rows;
  const last = items[items.length - 1];

  return {
    items,
    nextCursor:
      hasMore && last ? encodeCursor({ date: last.date, created_at: last.created_at }) : null,
  };
}

export async function getTransaction(userId: string, transactionId: string): Promise<Transaction> {
  const [transaction] = await sql<Transaction[]>`
    SELECT * FROM transactions
    WHERE id = ${transactionId} AND user_id = ${userId} AND group_id IS NULL
  `;

  if (!transaction) {
    throw new HttpError(404, "Transaction not found", "not_found");
  }

  return transaction;
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput
): Promise<Transaction> {
  assertNoGroup(input.group_id);

  const [transaction] = await sql<Transaction[]>`
    INSERT INTO transactions (user_id, category_id, amount, type, date, note)
    VALUES (${userId}, ${input.category_id}, ${input.amount}, ${input.type}, ${input.date}, ${input.note ?? null})
    RETURNING *
  `;
  return transaction;
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: UpdateTransactionInput
): Promise<Transaction> {
  assertNoGroup(input.group_id);

  const [transaction] = await sql<Transaction[]>`
    UPDATE transactions
    SET
      category_id = COALESCE(${input.category_id ?? null}, category_id),
      amount = COALESCE(${input.amount ?? null}, amount),
      type = COALESCE(${input.type ?? null}, type),
      date = COALESCE(${input.date ?? null}, date),
      note = COALESCE(${input.note ?? null}, note)
    WHERE id = ${transactionId} AND user_id = ${userId} AND group_id IS NULL
    RETURNING *
  `;

  if (!transaction) {
    throw new HttpError(404, "Transaction not found", "not_found");
  }

  return transaction;
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<void> {
  const result = await sql`
    DELETE FROM transactions
    WHERE id = ${transactionId} AND user_id = ${userId} AND group_id IS NULL
  `;

  if (result.count === 0) {
    throw new HttpError(404, "Transaction not found", "not_found");
  }
}
