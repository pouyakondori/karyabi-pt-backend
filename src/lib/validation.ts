import type { ZodError } from "zod";

export function formatZodError(error: ZodError, translate: (key: string) => string) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: translate(issue.message)
  }));
}
