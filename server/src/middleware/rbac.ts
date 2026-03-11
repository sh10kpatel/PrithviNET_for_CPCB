import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth";
import type { Role } from "../types";

export function authorize(...allowed: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowed.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden", code: "ROLE_DENIED" });
      return;
    }
    next();
  };
}
