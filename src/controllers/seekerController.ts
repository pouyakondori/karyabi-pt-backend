import { JobStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { ZodError } from "zod";

import { prisma } from "../config/prisma";
import { AppError } from "../lib/app-error";
import { serializeJob } from "../lib/job";
import { deleteEncryptedResumeFile, extractManagedResumeFileId } from "../lib/resume-storage";
import { formatZodError } from "../lib/validation";
import { seekerProfileSchema } from "../validations/profile";

export async function getSeekerProfile(request: Request, response: Response) {
  const userId = request.auth?.userId;

  if (!userId) {
    throw new AppError(request.t("errors.unauthorized"), 401);
  }

  const profile = await prisma.jobSeekerProfile.findUnique({
    where: { userId }
  });

  return response.json({
    success: true,
    message: request.t("messages.profileFetched"),
    data: profile
  });
}

export async function upsertSeekerProfile(request: Request, response: Response) {
  const userId = request.auth?.userId;

  if (!userId) {
    throw new AppError(request.t("errors.unauthorized"), 401);
  }

  try {
    const payload = seekerProfileSchema.parse(request.body);
    const existingProfile = await prisma.jobSeekerProfile.findUnique({
      where: { userId },
      select: { resumeUrl: true }
    });

    const previousResumeFileId = extractManagedResumeFileId(existingProfile?.resumeUrl);
    const nextResumeFileId = extractManagedResumeFileId(payload.resumeUrl);

    if (previousResumeFileId && previousResumeFileId !== nextResumeFileId) {
      await deleteEncryptedResumeFile(previousResumeFileId).catch(() => undefined);
    }

    const profile = await prisma.jobSeekerProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...payload,
        residencyExpirationDate: payload.residencyExpirationDate
          ? new Date(payload.residencyExpirationDate)
          : null,
        resumeUrl: payload.resumeUrl || null,
        linkedinUrl: payload.linkedinUrl || null
      },
      update: {
        ...payload,
        residencyExpirationDate: payload.residencyExpirationDate
          ? new Date(payload.residencyExpirationDate)
          : null,
        resumeUrl: payload.resumeUrl || null,
        linkedinUrl: payload.linkedinUrl || null
      }
    });

    return response.json({
      success: true,
      message: request.t("messages.profileSaved"),
      data: profile
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(request.t("errors.validation.required"), 422, formatZodError(error, request.t));
    }

    throw error;
  }
}

export async function getRecommendedJobs(request: Request, response: Response) {
  const userId = request.auth?.userId;

  if (!userId) {
    throw new AppError(request.t("errors.unauthorized"), 401);
  }

  const profile = await prisma.jobSeekerProfile.findUnique({
    where: { userId },
    select: { generalExpertise: true }
  });

  const expertise = profile?.generalExpertise ?? [];

  const jobs = await prisma.job.findMany({
    where: {
      status: JobStatus.approved,
      isSuspended: false,
      employer: { isSuspended: false },
      OR: [{ vacancies: null }, { vacancies: { gt: 0 } }],
      ...(expertise.length > 0
        ? {
            OR: expertise.flatMap((item) => [
              { title: { contains: item, mode: "insensitive" } },
              { description: { contains: item, mode: "insensitive" } }
            ])
          }
        : {})
    },
    take: 10,
    orderBy: {
      createdAt: "desc"
    }
  });

  return response.json({
    success: true,
    message: request.t("messages.recommendedJobsFetched"),
    data: jobs.map(serializeJob)
  });
}
