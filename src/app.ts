import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { env } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler";
import { gdprGuard } from "./middlewares/gdprGuard";
import { localeMiddleware } from "./middlewares/localeMiddleware";
import { router } from "./routes";

export const app = express();

app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true
  })
);
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
app.use(errorHandler);
