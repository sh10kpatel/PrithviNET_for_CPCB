import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type { JWTPayload } from "../types";

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "No token provided", code: "AUTH_REQUIRED" });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token", code: "AUTH_INVALID" });
  }
}
