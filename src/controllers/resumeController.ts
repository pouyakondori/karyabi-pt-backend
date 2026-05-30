import { Role } from "@prisma/client";
import type { Request, Response } from "express";

import { prisma } from "../config/prisma";
import { AppError } from "../lib/app-error";
import { getSingleValue } from "../lib/http";
import { buildResumeAccessUrl, extractManagedResumeFileId, readEncryptedResumeFile, storeEncryptedResumeFile } from "../lib/resume-storage";

export async function uploadSeekerResume(request: Request, response: Response) {
  const userId = request.auth?.userId;
  const file = request.file;

  if (!userId) {
    throw new AppError(request.t("errors.unauthorized"), 401);
  }

  if (!file) {
    throw new AppError(request.t("errors.validation.required"), 422);
  }

  const { fileId, originalName } = await storeEncryptedResumeFile(file);
  const url = buildResumeAccessUrl(request, fileId);

  return response.status(201).json({
    success: true,
    message: request.t("messages.resumeUploaded"),
    data: {
      url,
      fileName: originalName
    }
  });
}

export async function downloadResume(request: Request, response: Response) {
  const userId = request.auth?.userId;
  const role = request.auth?.role;
  const fileId = getSingleValue(request.params.fileId);

  if (!userId || !role) {
    throw new AppError(request.t("errors.unauthorized"), 401);
  }

  if (!fileId) {
    throw new AppError(request.t("errors.notFound"), 404);
  }

  const accessUrlSuffix = `/files/resumes/${fileId}`;

  let allowed = false;

  if (role === Role.job_seeker) {
    const profile = await prisma.jobSeekerProfile.findUnique({
      where: { userId },
      select: { resumeUrl: true }
    });

    allowed = extractManagedResumeFileId(profile?.resumeUrl) === fileId;
  }

  if (!allowed && role === Role.employer) {
    const profile = await prisma.jobSeekerProfile.findFirst({
      where: {
        resumeUrl: { endsWith: accessUrlSuffix },
        user: {
          applications: {
            some: {
              job: {
                employerId: userId
              }
            }
          }
        }
      },
      select: { userId: true }
    });

    allowed = Boolean(profile);
  }

  if (!allowed && role === Role.admin) {
    const profile = await prisma.jobSeekerProfile.findFirst({
      where: {
        resumeUrl: { endsWith: accessUrlSuffix }
      },
      select: { userId: true }
    });

    allowed = Boolean(profile);
  }

  if (!allowed) {
    throw new AppError(request.t("errors.forbidden"), 403);
  }

  const file = await readEncryptedResumeFile(fileId).catch(() => null);

  if (!file) {
    throw new AppError(request.t("errors.notFound"), 404);
  }

  response.setHeader("Content-Type", file.mimeType || "application/octet-stream");
  response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);
  response.setHeader("Cache-Control", "private, no-store");

  return response.send(file.buffer);
}
