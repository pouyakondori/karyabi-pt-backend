import type { NextFunction, Request, Response } from "express";

import { AppError } from "../lib/app-error";

export function errorHandler(
  error: Error,
  request: Request,
  _response: Response,
  next: NextFunction
) {
  if (_response.headersSent) {
    return next(error);
  }

  if (error instanceof AppError) {
    return _response.status(error.statusCode).json({
      success: false,
      message: error.message,
      details: error.details ?? null
    });
  }

  return _response.status(500).json({
    success: false,
    message: request.t?.("errors.internal") ?? "errors.internal",
    details: null
  });
}
