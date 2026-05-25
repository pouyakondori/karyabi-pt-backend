import type { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

import { AppError } from "../lib/app-error";

export function roleGuard(allowedRoles: Role[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.auth || !allowedRoles.includes(request.auth.role)) {
      return next(new AppError(request.t("errors.forbidden"), 403));
    }

    return next();
  };
}
