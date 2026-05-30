import { z } from "zod";

export const reviewCandidateSchema = z
  .object({
    decision: z.enum(["accepted", "rejected"], {
      message: "errors.validation.invalidDecision"
    }),
    rejectionReason: z.string().optional()
  })
  .superRefine((payload, context) => {
    if (payload.decision === "rejected" && !payload.rejectionReason?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionReason"],
        message: "errors.validation.required"
      });
    }
  });

export type ReviewCandidateInput = z.infer<typeof reviewCandidateSchema>;
