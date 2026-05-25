import { JobStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { ZodError } from "zod";

import { prisma } from "../config/prisma";
import { AppError } from "../lib/app-error";
import { getSingleValue } from "../lib/http";
import { serializeJob } from "../lib/job";
import { formatZodError } from "../lib/validation";
import { updateJobStatusSchema } from "../validations/job";

export async function listPendingJobs(request: Request, response: Response) {
  const jobs = await prisma.job.findMany({
    where: {
      status: JobStatus.pending
    },
    orderBy: {
      createdAt: "asc"
    },
    include: {
      employer: {
        select: {
          id: true,
          email: true
        }
      }
    }
  });

  return response.json({
    success: true,
    message: request.t("messages.pendingJobsFetched"),
    data: jobs.map(serializeJob)
  });
}

export async function updateJobStatus(request: Request, response: Response) {
  try {
    const payload = updateJobStatusSchema.parse(request.body);

    const jobId = getSingleValue(request.params.id);

    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true }
    });

    if (!existingJob) {
      throw new AppError(request.t("errors.notFound"), 404);
    }

    const job = await prisma.job.update({
      where: { id: jobId },
      data: { status: payload.status }
    });

    return response.json({
      success: true,
      message: request.t("messages.jobStatusUpdated"),
      data: serializeJob(job)
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(request.t("errors.validation.required"), 422, formatZodError(error, request.t));
    }

    throw error;
  }
}
