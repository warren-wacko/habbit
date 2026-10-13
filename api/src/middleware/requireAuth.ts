import { Request, Response, NextFunction } from "express";
import { HttpError } from "../lib/httpError.js";
import { verifyToken } from "../lib/jwt.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing token");
  }

  const token = header.slice("Bearer ".length);
  try {
    res.locals.userId = verifyToken(token);
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }

  next();
}
