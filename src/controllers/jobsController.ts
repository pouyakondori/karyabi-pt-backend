import { JobStatus } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../config/prisma";
import { AppError } from "../lib/app-error";
import { getSingleValue } from "../lib/http";
import { apiJobTypeToDb, serializeJob } from "../lib/job";

export async function getPublicJobs(request: Request, response: Response) {
  const type = getSingleValue(request.query.type as string | string[] | undefined);

  const normalizedType = type === "full-time" || type === "part-time" ? apiJobTypeToDb[type] : undefined;

  const jobs = await prisma.job.findMany({
    where: {
      status: JobStatus.approved,
      OR: [{ vacancies: null }, { vacancies: { gt: 0 } }],
      ...(normalizedType ? { type: normalizedType } : {})
    },
    orderBy: {
      createdAt: "desc"
    },
    select: {
      id: true,
      title: true,
      description: true,
      companyName: true,
      location: true,
      salaryMin: true,
      salaryMax: true,
      workplaceType: true,
      experienceLevel: true,
      vacancies: true,
      applicationDeadline: true,
      type: true,
      status: true,
      createdAt: true
    }
  });

  return response.json({
    success: true,
    message: request.t("messages.jobsFetched"),
    data: jobs.map(serializeJob)
  });
}

export async function applyToJob(request: Request, response: Response) {
  const seekerId = request.auth?.userId;

  if (!seekerId) {
    throw new AppError(request.t("errors.unauthorized"), 401);
  }

  const jobId = getSingleValue(request.params.id);

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, vacancies: true }
  });

  if (!job) {
    throw new AppError(request.t("errors.notFound"), 404);
  }

  if (job.status !== JobStatus.approved) {
    throw new AppError(request.t("errors.jobNotApproved"), 400);
  }

  if ((job.vacancies ?? 1) <= 0) {
    throw new AppError(request.t("errors.jobClosed"), 409);
  }

  const existingApplication = await prisma.application.findUnique({
    where: {
      jobId_seekerId: {
        jobId: job.id,
        seekerId
      }
    }
  });

  if (existingApplication) {
    throw new AppError(request.t("errors.duplicateApplication"), 409);
  }

  const application = await prisma.application.create({
    data: {
      jobId: job.id,
      seekerId
    }
  });

  return response.status(201).json({
    success: true,
    message: request.t("messages.applicationSubmitted"),
    data: application
  });
}
