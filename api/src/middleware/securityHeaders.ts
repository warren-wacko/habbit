import type { NextFunction, Request, Response } from "express";

/** Headers that tell browsers to be careful with what the API sends */
export function securityHeaders(production: boolean) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    // answers are personal and change often: never keep a copy in a shared cache
    res.setHeader("Cache-Control", "no-store");
    if (production) {
      res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
    }
    next();
  };
}
