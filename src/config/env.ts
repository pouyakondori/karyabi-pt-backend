import dotenv from "dotenv";

dotenv.config();

const configuredOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URLS
]
  .filter(Boolean)
  .flatMap((value) => (value as string).split(","))
  .map((value) => value.trim())
  .filter(Boolean);

export const env = {
  port: Number(process.env.PORT ?? 4000),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  backendPublicUrl: process.env.BACKEND_PUBLIC_URL ?? "",
  allowedOrigins: configuredOrigins,
  jwtSecret: process.env.JWT_SECRET ?? "change-me",
  resumeEncryptionSecret: process.env.RESUME_ENCRYPTION_SECRET ?? process.env.JWT_SECRET ?? "change-me-local-only",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:4000/api/auth/google/callback",
  gdprCookieName: process.env.GDPR_COOKIE_NAME ?? "karyabi_gdpr_consented",
  allowDevAuth: process.env.ALLOW_DEV_AUTH === "true" || process.env.NODE_ENV !== "production"
};
