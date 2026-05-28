ALTER TABLE "jobs"
ADD COLUMN "company_name" TEXT,
ADD COLUMN "location" TEXT,
ADD COLUMN "salary_min" INTEGER,
ADD COLUMN "salary_max" INTEGER,
ADD COLUMN "workplace_type" TEXT,
ADD COLUMN "experience_level" TEXT,
ADD COLUMN "vacancies" INTEGER,
ADD COLUMN "application_deadline" DATE;
