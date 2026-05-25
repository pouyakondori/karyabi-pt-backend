import { PortugalRegion } from "@prisma/client";
import { z } from "zod";

const optionalUrl = z.string().url("errors.validation.invalidUrl").optional().or(z.literal(""));

export const seekerProfileSchema = z.object({
  fullName: z.string().min(1, "errors.validation.required"),
  hasResidencePermit: z.boolean(),
  residencyExpirationDate: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "errors.validation.invalidDate"),
  hasWorkPermit: z.boolean(),
  residencyPermitType: z.string().min(1, "errors.validation.required"),
  canRideBike: z.boolean(),
  universityFieldAndDegree: z.string().min(1, "errors.validation.required"),
  hasPortugueseDrivingLicense: z.boolean(),
  hasUberExperience: z.boolean(),
  generalExpertise: z.array(z.string().min(1, "errors.validation.required")).min(1),
  portugalRegion: z.nativeEnum(PortugalRegion),
  phoneNumber: z.string().regex(/^\+?[0-9\s-]{9,20}$/, "errors.validation.phoneInvalid"),
  address: z.string().min(1, "errors.validation.required"),
  resumeUrl: optionalUrl,
  linkedinUrl: optionalUrl
});

export type SeekerProfileInput = z.infer<typeof seekerProfileSchema>;
