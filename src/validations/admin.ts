import { z } from "zod";

export const suspendEntitySchema = z.object({
  suspended: z.boolean()
});

export type SuspendEntityInput = z.infer<typeof suspendEntitySchema>;
