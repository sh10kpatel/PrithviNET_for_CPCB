import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error & { status?: number; code?: string },
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(`[${req.method} ${req.path}]`, err.message, err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
    code: err.code || "INTERNAL_ERROR",
  });
}
