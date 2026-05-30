import { Role } from "@prisma/client";
import multer from "multer";
import { Router } from "express";

import { devLogin, getGoogleAuthUrl, handleGoogleCallback } from "../controllers/authController";
import {
  deleteAdminJob,
  deleteAdminUser,
  getAdminOverview,
  listPendingJobs,
  suspendAdminJob,
  suspendAdminUser,
  updateJobStatus
} from "../controllers/adminController";
import {
  createEmployerJob,
  deleteEmployerJob,
  getEmployerCandidate,
  getJobCandidates,
  listEmployerJobs,
  reviewEmployerCandidate
} from "../controllers/employerController";
import { applyToJob, getPublicJobs } from "../controllers/jobsController";
import { downloadResume, uploadSeekerResume } from "../controllers/resumeController";
import { getRecommendedJobs, getSeekerProfile, upsertSeekerProfile } from "../controllers/seekerController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { authGuard } from "../middlewares/authGuard";
import { roleGuard } from "../middlewares/roleGuard";

export const router = Router();

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_request, file, callback) => {
    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error("resume_invalid_file_type"));
  }
});

router.get("/auth/google", asyncHandler(getGoogleAuthUrl));
router.get("/auth/google/callback", asyncHandler(handleGoogleCallback));
router.post("/auth/dev-login", asyncHandler(devLogin));
router.get("/jobs/public", asyncHandler(getPublicJobs));
router.get("/files/resumes/:fileId", authGuard, asyncHandler(downloadResume));

router.get(
  "/seeker/profile",
  authGuard,
  roleGuard([Role.job_seeker]),
  asyncHandler(getSeekerProfile)
);
router.post(
  "/seeker/profile",
  authGuard,
  roleGuard([Role.job_seeker]),
  asyncHandler(upsertSeekerProfile)
);
router.post(
  "/seeker/profile/resume",
  authGuard,
  roleGuard([Role.job_seeker]),
  resumeUpload.single("file"),
  asyncHandler(uploadSeekerResume)
);
router.get(
  "/seeker/recommended-jobs",
  authGuard,
  roleGuard([Role.job_seeker]),
  asyncHandler(getRecommendedJobs)
);
router.post(
  "/jobs/:id/apply",
  authGuard,
  roleGuard([Role.job_seeker]),
  asyncHandler(applyToJob)
);

router.get(
  "/employer/jobs",
  authGuard,
  roleGuard([Role.employer]),
  asyncHandler(listEmployerJobs)
);
router.post(
  "/employer/jobs",
  authGuard,
  roleGuard([Role.employer]),
  asyncHandler(createEmployerJob)
);
router.get(
  "/employer/jobs/:id/candidates",
  authGuard,
  roleGuard([Role.employer]),
  asyncHandler(getJobCandidates)
);
router.get(
  "/employer/jobs/:id/candidates/:candidateId",
  authGuard,
  roleGuard([Role.employer]),
  asyncHandler(getEmployerCandidate)
);
router.patch(
  "/employer/jobs/:id/candidates/:candidateId/review",
  authGuard,
  roleGuard([Role.employer]),
  asyncHandler(reviewEmployerCandidate)
);
router.delete(
  "/employer/jobs/:id",
  authGuard,
  roleGuard([Role.employer]),
  asyncHandler(deleteEmployerJob)
);

router.get(
  "/admin/overview",
  authGuard,
  roleGuard([Role.admin]),
  asyncHandler(getAdminOverview)
);
router.get(
  "/admin/jobs/pending",
  authGuard,
  roleGuard([Role.admin]),
  asyncHandler(listPendingJobs)
);
router.patch(
  "/admin/jobs/:id/status",
  authGuard,
  roleGuard([Role.admin]),
  asyncHandler(updateJobStatus)
);
router.patch(
  "/admin/users/:id/suspend",
  authGuard,
  roleGuard([Role.admin]),
  asyncHandler(suspendAdminUser)
);
router.delete(
  "/admin/users/:id",
  authGuard,
  roleGuard([Role.admin]),
  asyncHandler(deleteAdminUser)
);
router.patch(
  "/admin/jobs/:id/suspend",
  authGuard,
  roleGuard([Role.admin]),
  asyncHandler(suspendAdminJob)
);
router.delete(
  "/admin/jobs/:id",
  authGuard,
  roleGuard([Role.admin]),
  asyncHandler(deleteAdminJob)
);
