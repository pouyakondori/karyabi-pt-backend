import { z } from "zod";

export const suspendEntitySchema = z.object({
  suspended: z.boolean()
});

export const createAdminSchema = z.object({
  email: z.string().email("errors.validation.invalidEmail")
});

export type SuspendEntityInput = z.infer<typeof suspendEntitySchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
