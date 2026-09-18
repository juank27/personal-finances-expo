import { z } from "zod";

export const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1, "El nombre no puede estar vacío").max(120),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
