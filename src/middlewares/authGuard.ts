import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../lib/app-error";

type AuthPayload = {
  sub: string;
  role: Role;
  email?: string;
};

export async function authGuard(request: Request, _response: Response, next: NextFunction) {
  const authorization = request.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return next(new AppError(request.t("errors.unauthorized"), 401));
  }

  try {
    const token = authorization.replace("Bearer ", "");
    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isSuspended: true }
    });

    if (!user) {
      return next(new AppError(request.t("errors.unauthorized"), 401));
    }

    if (user.isSuspended) {
      return next(new AppError(request.t("errors.accountSuspended"), 403));
    }

    request.auth = {
      userId: user.id,
      role: user.role,
      email: user.email
    };

    return next();
  } catch {
    return next(new AppError(request.t("errors.unauthorized"), 401));
  }
}
