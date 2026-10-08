import { z } from "zod";

export const createEmailBackfillSchema = z
  .object({
    from: z.string().date(),
    to: z.string().date(),
  })
  .refine((data) => data.to >= data.from, {
    message: "to must be on or after from",
    path: ["to"],
  });

export type CreateEmailBackfillInput = z.infer<typeof createEmailBackfillSchema>;
