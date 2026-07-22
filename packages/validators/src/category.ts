import { z } from "zod";

export const transactionTypeSchema = z.enum(["income", "expense"]);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  icon: z.string().trim().min(1).max(40),
  type: transactionTypeSchema,
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  icon: z.string().trim().min(1).max(40).optional(),
  archived: z.boolean().optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
