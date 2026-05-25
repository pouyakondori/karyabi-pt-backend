import { JobStatus } from "@prisma/client";
import { z } from "zod";

export const createJobSchema = z.object({
  title: z.string().min(1, "errors.validation.required"),
  description: z.string().min(1, "errors.validation.required"),
  type: z.enum(["full-time", "part-time"], {
    message: "errors.validation.invalidType"
  })
});

export const updateJobStatusSchema = z.object({
  status: z.enum([JobStatus.approved, JobStatus.rejected], {
    message: "errors.validation.invalidStatus"
  })
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobStatusInput = z.infer<typeof updateJobStatusSchema>;
