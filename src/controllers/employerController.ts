import { JobStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { ZodError } from "zod";

import { prisma } from "../config/prisma";
import { AppError } from "../lib/app-error";
import { getSingleValue } from "../lib/http";
import { apiJobTypeToDb, serializeJob } from "../lib/job";
import { formatZodError } from "../lib/validation";
import { createJobSchema } from "../validations/job";

export async function listEmployerJobs(request: Request, response: Response) {
  const employerId = request.auth?.userId;

  if (!employerId) {
    throw new AppError(request.t("errors.unauthorized"), 401);
  }

  const jobs = await prisma.job.findMany({
    where: { employerId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { applications: true }
      }
    }
  });

  return response.json({
    success: true,
    message: request.t("messages.jobsFetched"),
    data: jobs.map(serializeJob)
  });
}

export async function createEmployerJob(request: Request, response: Response) {
  const employerId = request.auth?.userId;

  if (!employerId) {
    throw new AppError(request.t("errors.unauthorized"), 401);
  }

  try {
    const payload = createJobSchema.parse(request.body);

    const job = await prisma.job.create({
      data: {
        employerId,
        title: payload.title,
        description: payload.description,
        companyName: payload.companyName,
        location: payload.location,
        salaryMin: payload.salaryMin,
        salaryMax: payload.salaryMax,
        workplaceType: payload.workplaceType,
        experienceLevel: payload.experienceLevel,
        vacancies: payload.vacancies,
        applicationDeadline: payload.applicationDeadline ? new Date(payload.applicationDeadline) : null,
        type: apiJobTypeToDb[payload.type],
        status: JobStatus.pending
      }
    });

    return response.status(201).json({
      success: true,
      message: request.t("messages.jobCreated"),
      data: serializeJob(job)
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(request.t("errors.validation.required"), 422, formatZodError(error, request.t));
    }

    throw error;
  }
}

export async function getJobCandidates(request: Request, response: Response) {
  const employerId = request.auth?.userId;
  const jobId = getSingleValue(request.params.id);

  if (!employerId) {
    throw new AppError(request.t("errors.unauthorized"), 401);
  }

  const job = await prisma.job.findFirst({
    where: {
      id: jobId,
      employerId
    },
    select: {
      id: true,
      title: true,
      applications: {
        orderBy: { appliedAt: "desc" },
        select: {
          id: true,
          appliedAt: true,
          seeker: {
            select: {
              id: true,
              email: true,
              seekerProfile: true
            }
          }
        }
      }
    }
  });

  if (!job) {
    throw new AppError(request.t("errors.notFound"), 404);
  }

  return response.json({
    success: true,
    message: request.t("messages.applicationsFetched"),
    data: job
  });
}
