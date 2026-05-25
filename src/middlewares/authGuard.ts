import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

import { env } from "../config/env";
import { AppError } from "../lib/app-error";

type AuthPayload = {
  sub: string;
  role: Role;
  email?: string;
};

export function authGuard(request: Request, _response: Response, next: NextFunction) {
  const authorization = request.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return next(new AppError(request.t("errors.unauthorized"), 401));
  }

  try {
    const token = authorization.replace("Bearer ", "");
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;

    request.auth = {
      userId: payload.sub,
      role: payload.role,
      email: payload.email
    };

    return next();
  } catch {
    return next(new AppError(request.t("errors.unauthorized"), 401));
  }
}
