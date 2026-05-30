import { ApplicationStatus, JobStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { ZodError } from "zod";

import { prisma } from "../config/prisma";
import { AppError } from "../lib/app-error";
import { getSingleValue } from "../lib/http";
import { apiJobTypeToDb, serializeJob } from "../lib/job";
import { formatZodError } from "../lib/validation";
import { reviewCandidateSchema } from "../validations/application";
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
    include: {
      _count: {
        select: { applications: true }
      },
      applications: {
        orderBy: { appliedAt: "desc" },
        select: {
          id: true,
          status: true,
          rejectionReason: true,
          reviewedAt: true,
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

  const { applications, ...jobData } = job;

  return response.json({
    success: true,
    message: request.t("messages.applicationsFetched"),
    data: {
      job: serializeJob(jobData),
      applications
    }
  });
}

export async function getEmployerCandidate(request: Request, response: Response) {
  const employerId = request.auth?.userId;
  const jobId = getSingleValue(request.params.id);
  const candidateId = getSingleValue(request.params.candidateId);

  if (!employerId) {
    throw new AppError(request.t("errors.unauthorized"), 401);
  }

  const application = await prisma.application.findFirst({
    where: {
      id: candidateId,
      jobId,
      job: {
        employerId
      }
    },
    select: {
      id: true,
      status: true,
      rejectionReason: true,
      reviewedAt: true,
      appliedAt: true,
      seeker: {
        select: {
          id: true,
          email: true,
          seekerProfile: true
        }
      },
      job: {
        include: {
          _count: {
            select: { applications: true }
          }
        }
      }
    }
  });

  if (!application) {
    throw new AppError(request.t("errors.notFound"), 404);
  }

  return response.json({
    success: true,
    message: request.t("messages.candidateFetched"),
    data: {
      application: {
        id: application.id,
        status: application.status,
        rejectionReason: application.rejectionReason,
        reviewedAt: application.reviewedAt,
        appliedAt: application.appliedAt,
        seeker: application.seeker
      },
      job: serializeJob(application.job)
    }
  });
}

export async function reviewEmployerCandidate(request: Request, response: Response) {
  const employerId = request.auth?.userId;
  const jobId = getSingleValue(request.params.id);
  const candidateId = getSingleValue(request.params.candidateId);

  if (!employerId) {
    throw new AppError(request.t("errors.unauthorized"), 401);
  }

  try {
    const payload = reviewCandidateSchema.parse(request.body);

    const application = await prisma.application.findFirst({
      where: {
        id: candidateId,
        jobId,
        job: {
          employerId
        }
      },
      include: {
        job: true
      }
    });

    if (!application) {
      throw new AppError(request.t("errors.notFound"), 404);
    }

    if (application.status !== ApplicationStatus.pending) {
      throw new AppError(request.t("errors.applicationAlreadyReviewed"), 409);
    }

    if (payload.decision === "rejected") {
      const updatedApplication = await prisma.application.update({
        where: {
          id: application.id
        },
        data: {
          status: ApplicationStatus.rejected,
          rejectionReason: payload.rejectionReason?.trim() ?? null,
          reviewedAt: new Date()
        },
        select: {
          id: true,
          status: true,
          rejectionReason: true,
          reviewedAt: true,
          appliedAt: true,
          seeker: {
            select: {
              id: true,
              email: true,
              seekerProfile: true
            }
          }
        }
      });

      return response.json({
        success: true,
        message: request.t("messages.candidateRejected"),
        data: {
          application: updatedApplication,
          job: serializeJob(application.job)
        }
      });
    }

    const currentVacancies = application.job.vacancies ?? 1;

    if (currentVacancies <= 0 || application.job.status === JobStatus.closed) {
      throw new AppError(request.t("errors.jobClosed"), 409);
    }

    const reviewedAt = new Date();
    const remainingVacancies = Math.max(currentVacancies - 1, 0);

    const result = await prisma.$transaction(async (transaction) => {
      const updatedApplication = await transaction.application.update({
        where: {
          id: application.id
        },
        data: {
          status: ApplicationStatus.accepted,
          rejectionReason: null,
          reviewedAt
        },
        select: {
          id: true,
          status: true,
          rejectionReason: true,
          reviewedAt: true,
          appliedAt: true,
          seeker: {
            select: {
              id: true,
              email: true,
              seekerProfile: true
            }
          }
        }
      });

      const updatedJob = await transaction.job.update({
        where: {
          id: application.job.id
        },
        data: {
          vacancies: remainingVacancies,
          status: remainingVacancies === 0 ? JobStatus.closed : application.job.status
        },
        include: {
          _count: {
            select: { applications: true }
          }
        }
      });

      return {
        application: updatedApplication,
        job: serializeJob(updatedJob)
      };
    });

    return response.json({
      success: true,
      message: remainingVacancies === 0 ? request.t("messages.candidateAcceptedAndJobClosed") : request.t("messages.candidateAccepted"),
      data: result
    });
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(request.t("errors.validation.required"), 422, formatZodError(error, request.t));
    }

    throw error;
  }
}

export async function deleteEmployerJob(request: Request, response: Response) {
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
      id: true
    }
  });

  if (!job) {
    throw new AppError(request.t("errors.notFound"), 404);
  }

  await prisma.job.delete({
    where: {
      id: job.id
    }
  });

  return response.json({
    success: true,
    message: request.t("messages.jobDeleted"),
    data: null
  });
}
