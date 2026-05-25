import type { NextFunction, Request, Response } from "express";
import locale from "../locales/fa.json";
import { createTranslator } from "../lib/i18n";

export function localeMiddleware(request: Request, _response: Response, next: NextFunction) {
  request.locale = locale;
  request.t = createTranslator(locale);
  next();
}
