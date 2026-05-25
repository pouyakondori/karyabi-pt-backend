import { JobType } from "@prisma/client";

export const apiJobTypeToDb: Record<"full-time" | "part-time", JobType> = {
  "full-time": JobType.full_time,
  "part-time": JobType.part_time
};

export const dbJobTypeToApi: Record<JobType, "full-time" | "part-time"> = {
  [JobType.full_time]: "full-time",
  [JobType.part_time]: "part-time"
};

export function serializeJob<T extends { type: JobType }>(job: T) {
  return {
    ...job,
    type: dbJobTypeToApi[job.type]
  };
}
