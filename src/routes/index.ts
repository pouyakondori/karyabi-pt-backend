import { Role } from "@prisma/client";
import { Router } from "express";

import { devLogin, getGoogleAuthUrl, handleGoogleCallback } from "../controllers/authController";
import { listPendingJobs, updateJobStatus } from "../controllers/adminController";
import {
  createEmployerJob,
  deleteEmployerJob,
  getEmployerCandidate,
  getJobCandidates,
  listEmployerJobs,
  reviewEmployerCandidate
} from "../controllers/employerController";
import { applyToJob, getPublicJobs } from "../controllers/jobsController";
import { getRecommendedJobs, getSeekerProfile, upsertSeekerProfile } from "../controllers/seekerController";
import { asyncHandler } from "../middlewares/asyncHandler";
import { authGuard } from "../middlewares/authGuard";
import { roleGuard } from "../middlewares/roleGuard";

export const router = Router();

router.get("/auth/google", asyncHandler(getGoogleAuthUrl));
router.get("/auth/google/callback", asyncHandler(handleGoogleCallback));
router.post("/auth/dev-login", asyncHandler(devLogin));
router.get("/jobs/public", asyncHandler(getPublicJobs));

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
