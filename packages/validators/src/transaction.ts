import { z } from "zod";
import { transactionTypeSchema } from "./category";

export const createTransactionSchema = z.object({
  category_id: z.string().uuid(),
  group_id: z.string().uuid().nullable().optional(),
  amount: z.coerce.number().positive(),
  type: transactionTypeSchema,
  date: z.string().date(),
  note: z.string().trim().max(280).nullable().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = createTransactionSchema.partial();

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export const listTransactionsQuerySchema = z.object({
  group_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().optional(),
  type: transactionTypeSchema.optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});

export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;
