import { Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";

import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { AppError } from "../lib/app-error";
import { getSingleValue } from "../lib/http";

const allowedOAuthRoles = [Role.job_seeker, Role.employer] as const;
type OAuthRole = (typeof allowedOAuthRoles)[number];

function resolveOAuthRole(rawRole: string | undefined): OAuthRole {
  return rawRole === Role.job_seeker || rawRole === Role.employer ? rawRole : Role.job_seeker;
}

function buildGoogleUrl(role: Role) {
  const state = Buffer.from(JSON.stringify({ role }), "utf8").toString("base64url");
  const searchParams = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${searchParams.toString()}`;
}

function signUserToken(user: { id: string; role: Role; email: string }) {
  return jwt.sign(
    {
      role: user.role,
      email: user.email
    },
    env.jwtSecret,
    {
      subject: user.id,
      expiresIn: "7d"
    }
  );
}

function persistConsentCookie(response: Response) {
  response.cookie(env.gdprCookieName, "true", {
    httpOnly: false,
    sameSite: "lax",
    path: "/"
  });
}

export async function getGoogleAuthUrl(request: Request, response: Response) {
  const role = resolveOAuthRole(getSingleValue(request.query.role as string | string[] | undefined));

  if (!env.googleClientId) {
    throw new AppError(request.t("errors.googleAuthNotConfigured"), 503);
  }

  persistConsentCookie(response);

  return response.json({
    success: true,
    message: request.t("messages.authUrlGenerated"),
    data: {
      url: buildGoogleUrl(role)
    }
  });
}

export async function devLogin(request: Request, response: Response) {
  if (!env.allowDevAuth) {
    throw new AppError(request.t("errors.devAuthDisabled"), 403);
  }

  const rawRole = getSingleValue(request.body?.role as string | string[] | undefined);

  if (rawRole !== Role.admin && rawRole !== Role.employer && rawRole !== Role.job_seeker) {
    throw new AppError(request.t("errors.invalidRole"), 422);
  }

  const user = await prisma.user.findFirst({
    where: {
      role: rawRole
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!user) {
    throw new AppError(request.t("errors.notFound"), 404);
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      gdprConsentedAt: new Date()
    }
  });

  const token = signUserToken(updatedUser);

  persistConsentCookie(response);

  return response.json({
    success: true,
    message: request.t("messages.devLoginSuccessful"),
    data: {
      token,
      user: {
        userId: updatedUser.id,
        role: updatedUser.role,
        email: updatedUser.email
      }
    }
  });
}

export async function handleGoogleCallback(request: Request, response: Response) {
  const code = getSingleValue(request.query.code as string | string[] | undefined);
  const rawState = getSingleValue(request.query.state as string | string[] | undefined);

  let requestedRole: OAuthRole = Role.job_seeker;

  if (rawState) {
    try {
      requestedRole = resolveOAuthRole(JSON.parse(Buffer.from(rawState, "base64url").toString("utf8")).role);
    } catch {
      requestedRole = Role.job_seeker;
    }
  }

  if (!code) {
    return response.redirect(env.frontendUrl);
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: env.googleRedirectUri,
      grant_type: "authorization_code"
    })
  });

  const tokenPayload = (await tokenResponse.json()) as { access_token?: string };

  const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token ?? ""}`
    }
  });

  const googleUser = (await userInfoResponse.json()) as {
    id: string;
    email: string;
  };

  const user = await prisma.user.upsert({
    where: { email: googleUser.email },
    update: {
      googleId: googleUser.id,
      gdprConsentedAt: new Date()
    },
    create: {
      email: googleUser.email,
      googleId: googleUser.id,
      role: requestedRole,
      gdprConsentedAt: new Date()
    }
  });

  const jwtToken = signUserToken(user);

  persistConsentCookie(response);

  const redirectUrl = new URL("/dashboard", env.frontendUrl);
  redirectUrl.searchParams.set("token", jwtToken);
  redirectUrl.searchParams.set("userId", user.id);
  redirectUrl.searchParams.set("role", user.role);
  redirectUrl.searchParams.set("email", user.email);

  return response.redirect(redirectUrl.toString());
}
