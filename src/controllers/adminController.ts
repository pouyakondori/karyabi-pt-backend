import { JobStatus, Role } from "@prisma/client";
import type { Request, Response } from "express";
import { ZodError } from "zod";

import { prisma } from "../config/prisma";
import { AppError } from "../lib/app-error";
import { getSingleValue } from "../lib/http";
import { serializeJob } from "../lib/job";
import { formatZodError } from "../lib/validation";
import { suspendEntitySchema } from "../validations/admin";
import { updateJobStatusSchema } from "../validations/job";

export async function listPendingJobs(request: Request, response: Response) {
  const jobs = await prisma.job.findMany({
    where: {
      status: JobStatus.pending,
      isSuspended: false
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

export async function getAdminOverview(request: Request, response: Response) {
  const [employers, jobSeekers, jobs] = await Promise.all([
    prisma.user.findMany({
      where: { role: Role.employer },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        isSuspended: true,
        createdAt: true,
        _count: { select: { employerJobs: true } }
      }
    }),
    prisma.user.findMany({
      where: { role: Role.job_seeker },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        isSuspended: true,
        createdAt: true,
        seekerProfile: { select: { fullName: true, portugalRegion: true } },
        _count: { select: { applications: true } }
      }
    }),
    prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        employer: { select: { id: true, email: true } },
        _count: { select: { applications: true } }
      }
    })
  ]);

  return response.json({
    success: true,
    message: request.t("messages.adminOverviewFetched"),
    data: {
      employers,
      jobSeekers,
      jobs: jobs.map(serializeJob)
    }
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

export async function suspendAdminUser(request: Request, response: Response) {
  try {
    const payload = suspendEntitySchema.parse(request.body);
    const userId = getSingleValue(request.params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    });

    if (!user || (user.role !== Role.employer && user.role !== Role.job_seeker)) {
      throw new AppError(request.t("errors.notFound"), 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { isSuspended: payload.suspended },
      select: {
        id: true,
        email: true,
        role: true,
        isSuspended: true,
        createdAt: true
      }
    });

    return response.json({
      success: true,
      message: payload.suspended ? request.t("messages.userSuspended") : request.t("messages.userUnsuspended"),
      data: updatedUser
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(request.t("errors.validation.required"), 422, formatZodError(error, request.t));
    }

    throw error;
  }
}

export async function deleteAdminUser(request: Request, response: Response) {
  const userId = getSingleValue(request.params.id);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true }
  });

  if (!user || (user.role !== Role.employer && user.role !== Role.job_seeker)) {
    throw new AppError(request.t("errors.notFound"), 404);
  }

  await prisma.user.delete({ where: { id: user.id } });

  return response.json({
    success: true,
    message: request.t("messages.userDeleted"),
    data: null
  });
}

export async function suspendAdminJob(request: Request, response: Response) {
  try {
    const payload = suspendEntitySchema.parse(request.body);
    const jobId = getSingleValue(request.params.id);

    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true }
    });

    if (!existingJob) {
      throw new AppError(request.t("errors.notFound"), 404);
    }

    const job = await prisma.job.update({
      where: { id: existingJob.id },
      data: { isSuspended: payload.suspended }
    });

    return response.json({
      success: true,
      message: payload.suspended ? request.t("messages.jobSuspended") : request.t("messages.jobUnsuspended"),
      data: serializeJob(job)
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(request.t("errors.validation.required"), 422, formatZodError(error, request.t));
    }

    throw error;
  }
}

export async function deleteAdminJob(request: Request, response: Response) {
  const jobId = getSingleValue(request.params.id);

  const existingJob = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true }
  });

  if (!existingJob) {
    throw new AppError(request.t("errors.notFound"), 404);
  }

  await prisma.job.delete({ where: { id: existingJob.id } });

  return response.json({
    success: true,
    message: request.t("messages.jobDeleted"),
    data: null
  });
}
