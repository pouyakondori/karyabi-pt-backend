import request from "supertest";
import { describe, expect, it } from "vitest";

import locale from "../src/locales/fa.json";
import { app } from "../src/app";

describe("api access control", () => {
  it("returns 403 when gdpr consent is missing", async () => {
    const response = await request(app).get("/api/jobs/public");

    expect(response.status).toBe(403);
    expect(response.body.message).toBe(locale.errors.gdprRequired);
  });

  it("returns 401 for protected routes without authentication", async () => {
    const response = await request(app)
      .get("/api/seeker/profile")
      .set("x-gdpr-consent", "true");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(locale.errors.unauthorized);
  });
});
