import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import { gdprGuard } from "./middlewares/gdprGuard";
import { localeMiddleware } from "./middlewares/localeMiddleware";
import { router } from "./routes";

export const app = express();

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, "");
}

function isAllowedOrigin(origin: string) {
  const normalizedOrigin = normalizeOrigin(origin);
  const configuredOrigins = [env.frontendUrl, ...env.allowedOrigins].map(normalizeOrigin);

  if (configuredOrigins.includes(normalizedOrigin)) {
    return true;
  }

  return /^https:\/\/karyabi-pt(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(normalizedOrigin);
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`cors_origin_denied:${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-gdpr-consent"]
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(localeMiddleware);

app.get("/", (_request, response) => {
  response.json({
    success: true,
    data: {
      service: "karyabi-pt-backend"
    }
  });
});

app.use("/api", gdprGuard, router);
app.use("/", gdprGuard, router);
app.use(errorHandler);
