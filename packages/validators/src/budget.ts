import { z } from "zod";

export const budgetPeriodSchema = z.enum(["monthly", "weekly"]);

export const createBudgetSchema = z
  .object({
    category_id: z.string().uuid(),
    group_id: z.string().uuid().nullable().optional(),
    amount_limit: z.coerce.number().positive(),
    period: budgetPeriodSchema,
    start_date: z.string().date(),
    end_date: z.string().date(),
    is_recurring: z.boolean().optional().default(true),
  })
  .refine((data) => data.end_date > data.start_date, {
    message: "end_date must be after start_date",
    path: ["end_date"],
  });

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const updateBudgetSchema = z.object({
  amount_limit: z.coerce.number().positive().optional(),
  is_recurring: z.boolean().optional(),
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
