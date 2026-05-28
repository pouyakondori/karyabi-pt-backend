import { JobStatus } from "@prisma/client";
import { z } from "zod";

export const createJobSchema = z
  .object({
    title: z.string().min(1, "errors.validation.required"),
    description: z.string().min(1, "errors.validation.required"),
    companyName: z.string().min(1, "errors.validation.required"),
    location: z.string().min(1, "errors.validation.required"),
    salaryMin: z.number().int().positive("errors.validation.required"),
    salaryMax: z.number().int().positive("errors.validation.required"),
    workplaceType: z.enum(["on_site", "hybrid", "remote"], {
      message: "errors.validation.invalidType"
    }),
    experienceLevel: z.enum(["entry", "mid", "senior"], {
      message: "errors.validation.invalidType"
    }),
    vacancies: z.number().int().positive("errors.validation.required"),
    applicationDeadline: z
      .string()
      .min(1, "errors.validation.required")
      .refine((value) => !Number.isNaN(Date.parse(value)), "errors.validation.required"),
    type: z.enum(["full-time", "part-time"], {
      message: "errors.validation.invalidType"
    })
  })
  .refine((payload) => payload.salaryMax >= payload.salaryMin, {
    message: "errors.validation.required",
    path: ["salaryMax"]
  });

export const updateJobStatusSchema = z.object({
  status: z.enum([JobStatus.approved, JobStatus.rejected], {
    message: "errors.validation.invalidStatus"
  })
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobStatusInput = z.infer<typeof updateJobStatusSchema>;
