ALTER TYPE "JobStatus" ADD VALUE IF NOT EXISTS 'closed';

DO $$ BEGIN
  CREATE TYPE "ApplicationStatus" AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "applications"
ADD COLUMN IF NOT EXISTS "status" "ApplicationStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMP(3);
