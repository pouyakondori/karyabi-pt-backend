import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env";
import { AppError } from "../lib/app-error";

export function gdprGuard(request: Request, _response: Response, next: NextFunction) {
  const headerConsent = request.header("x-gdpr-consent");
  const cookieConsent = request.cookies?.[env.gdprCookieName];
  const consented = [headerConsent, cookieConsent].some((value) => value === "true" || value === "1");

  if (!consented) {
    return next(new AppError(request.t("errors.gdprRequired"), 403));
  }

  request.gdprVerified = true;
  next();
}
