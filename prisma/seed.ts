import "dotenv/config";

import { JobStatus, JobType, PortugalRegion, PrismaClient, Role } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const jwtSecret = process.env.JWT_SECRET ?? "change-me";

async function main() {
  const adminEmail = "admin@karyabi.pt";
  const employerEmail = "employer@karyabi.pt";
  const seekerEmail = "seeker@karyabi.pt";

  const existingUsers = await prisma.user.findMany({
    where: {
      email: {
        in: [adminEmail, employerEmail, seekerEmail]
      }
    },
    select: {
      id: true,
      email: true
    }
  });

  const existingUserIds = existingUsers.map((user) => user.id);

  if (existingUserIds.length > 0) {
    await prisma.application.deleteMany({
      where: {
        OR: [
          {
            seekerId: {
              in: existingUserIds
            }
          },
          {
            job: {
              employerId: {
                in: existingUserIds
              }
            }
          }
        ]
      }
    });

    await prisma.job.deleteMany({
      where: {
        employerId: {
          in: existingUserIds
        }
      }
    });

    await prisma.jobSeekerProfile.deleteMany({
      where: {
        userId: {
          in: existingUserIds
        }
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: existingUserIds
        }
      }
    });
  }

  const gdprConsentedAt = new Date();

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      role: Role.admin,
      gdprConsentedAt
    }
  });

  const employer = await prisma.user.create({
    data: {
      email: employerEmail,
      role: Role.employer,
      gdprConsentedAt
    }
  });

  const seeker = await prisma.user.create({
    data: {
      email: seekerEmail,
      role: Role.job_seeker,
      gdprConsentedAt,
      seekerProfile: {
        create: {
          fullName: "علی رضایی",
          hasResidencePermit: true,
          residencyExpirationDate: new Date("2027-12-31"),
          hasWorkPermit: true,
          residencyPermitType: "temporary",
          canRideBike: true,
          universityFieldAndDegree: "کارشناسی مهندسی کامپیوتر",
          hasPortugueseDrivingLicense: true,
          hasUberExperience: true,
          generalExpertise: ["customer support", "delivery", "sales"],
          portugalRegion: PortugalRegion.lisboa,
          phoneNumber: "+351911111111",
          address: "Lisboa, Portugal",
          resumeUrl: "https://example.com/resume-seeker.pdf",
          linkedinUrl: "https://linkedin.com/in/seeker-karyabi"
        }
      }
    },
    include: {
      seekerProfile: true
    }
  });

  const approvedJobs = await prisma.job.createManyAndReturn({
    data: [
      {
        employerId: employer.id,
        title: "کارشناس پشتیبانی مشتری",
        description: "پاسخ‌گویی به مشتریان فارسی‌زبان و هماهنگی با تیم عملیاتی در لیسبون.",
        companyName: "Iranians PT Services",
        location: "Lisboa",
        salaryMin: 1200,
        salaryMax: 1500,
        workplaceType: "hybrid",
        experienceLevel: "mid",
        vacancies: 2,
        applicationDeadline: new Date("2026-07-15"),
        type: JobType.full_time,
        status: JobStatus.approved
      },
      {
        employerId: employer.id,
        title: "راننده و پیک شهری",
        description: "مناسب برای افراد دارای گواهینامه پرتغالی و تجربه کار با سرویس‌های تحویل و حمل‌ونقل.",
        companyName: "Lisbon Delivery Hub",
        location: "Setúbal",
        salaryMin: 850,
        salaryMax: 1100,
        workplaceType: "on_site",
        experienceLevel: "entry",
        vacancies: 3,
        applicationDeadline: new Date("2026-06-30"),
        type: JobType.part_time,
        status: JobStatus.approved
      },
      {
        employerId: employer.id,
        title: "همکار فروش تلفنی",
        description: "تماس با مشتریان، پیگیری سرنخ‌ها و ثبت گزارش فروش به زبان فارسی.",
        companyName: "Portugal Persian Sales",
        location: "Porto",
        salaryMin: 1000,
        salaryMax: 1400,
        workplaceType: "remote",
        experienceLevel: "mid",
        vacancies: 1,
        applicationDeadline: new Date("2026-07-10"),
        type: JobType.full_time,
        status: JobStatus.approved
      },
      {
        employerId: employer.id,
        title: "نیروی انبار و لجستیک",
        description: "ثبت آگهی آزمایشی برای صف بررسی مدیر سامانه.",
        companyName: "Atlantic Logistics",
        location: "Braga",
        salaryMin: 900,
        salaryMax: 1150,
        workplaceType: "on_site",
        experienceLevel: "entry",
        vacancies: 4,
        applicationDeadline: new Date("2026-07-20"),
        type: JobType.part_time,
        status: JobStatus.pending
      }
    ]
  });

  await prisma.application.create({
    data: {
      jobId: approvedJobs[0].id,
      seekerId: seeker.id
    }
  });

  const tokens = {
    admin: jwt.sign({ role: admin.role, email: admin.email }, jwtSecret, {
      subject: admin.id,
      expiresIn: "7d"
    }),
    employer: jwt.sign({ role: employer.role, email: employer.email }, jwtSecret, {
      subject: employer.id,
      expiresIn: "7d"
    }),
    seeker: jwt.sign({ role: seeker.role, email: seeker.email }, jwtSecret, {
      subject: seeker.id,
      expiresIn: "7d"
    })
  };

  console.log(
    JSON.stringify(
      {
        users: {
          admin: { id: admin.id, email: admin.email },
          employer: { id: employer.id, email: employer.email },
          seeker: { id: seeker.id, email: seeker.email, profile: seeker.seekerProfile }
        },
        jobs: approvedJobs.map((job) => ({ id: job.id, title: job.title, status: job.status, type: job.type })),
        tokens
      },
      null,
      2
    )
  );
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
