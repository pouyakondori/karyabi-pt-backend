import { PortugalRegion } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { seekerProfileSchema } from "../src/validations/profile";

describe("seeker profile validation", () => {
  it("accepts a valid profile payload", () => {
    const payload = {
      fullName: "نام نمونه",
      hasResidencePermit: true,
      residencyExpirationDate: "2027-01-10",
      hasWorkPermit: true,
      residencyPermitType: "temporary",
      canRideBike: true,
      universityFieldAndDegree: "مهندسی نرم افزار - کارشناسی",
      hasPortugueseDrivingLicense: true,
      hasUberExperience: false,
      generalExpertise: ["delivery", "support"],
      portugalRegion: PortugalRegion.lisboa,
      phoneNumber: "+351911111111",
      address: "Lisboa",
      resumeUrl: "https://example.com/resume.pdf",
      linkedinUrl: "https://linkedin.com/in/example"
    };

    expect(() => seekerProfileSchema.parse(payload)).not.toThrow();
  });

  it("rejects invalid phone numbers", () => {
    const payload = {
      fullName: "نام نمونه",
      hasResidencePermit: true,
      residencyExpirationDate: "2027-01-10",
      hasWorkPermit: true,
      residencyPermitType: "temporary",
      canRideBike: true,
      universityFieldAndDegree: "مهندسی نرم افزار - کارشناسی",
      hasPortugueseDrivingLicense: true,
      hasUberExperience: false,
      generalExpertise: ["delivery"],
      portugalRegion: PortugalRegion.lisboa,
      phoneNumber: "abc",
      address: "Lisboa"
    };

    expect(() => seekerProfileSchema.parse(payload)).toThrow();
  });
});
