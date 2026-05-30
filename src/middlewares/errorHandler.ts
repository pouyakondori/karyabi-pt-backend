import type { NextFunction, Request, Response } from "express";
import multer from "multer";

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

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? request.t?.("errors.validation.fileTooLarge") ?? "errors.validation.fileTooLarge"
        : request.t?.("errors.validation.required") ?? "errors.validation.required";

    return _response.status(422).json({
      success: false,
      message,
      details: null
    });
  }

  if (error.message === "resume_invalid_file_type") {
    return _response.status(422).json({
      success: false,
      message: request.t?.("errors.validation.invalidFileType") ?? "errors.validation.invalidFileType",
      details: null
    });
  }

  return _response.status(500).json({
    success: false,
    message: request.t?.("errors.internal") ?? "errors.internal",
    details: null
  });
}
