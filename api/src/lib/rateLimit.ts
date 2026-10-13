// Rate limiting: each visitor has a counter per kind of request. Past the limit, the API answers
// "429 Too Many Requests" with a hint for when to try again, and does no further work.
//
// The counts live in a "store". MemoryStore keeps them in this process, which is correct while
// one copy of the API runs. If several copies ever run, write a store with the same two methods
// that keeps its counters in Redis ("add one and set an expiry") and pass it to createLimiters.

import type { NextFunction, Request, RequestHandler, Response } from "express";

export type Hit = { count: number; resetAt: number };

export interface RateLimitStore {
  /** Count one request for `key` in a window of `windowMs`, starting a new window if needed */
  hit(key: string, windowMs: number, now?: number): Hit;
  /** Take one request back (used so successful logins do not count against someone) */
  undo(key: string): void;
}

export class MemoryStore implements RateLimitStore {
  private entries = new Map<string, Hit>();

  constructor(private maxEntries = 50_000) {}

  hit(key: string, windowMs: number, now = Date.now()): Hit {
    let entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      if (this.entries.size >= this.maxEntries) {
        this.sweep(now);
        // still full of live windows: make room by dropping the oldest one
        if (this.entries.size >= this.maxEntries) {
          const oldest = this.entries.keys().next().value;
          if (oldest !== undefined) this.entries.delete(oldest);
        }
      }
      entry = { count: 0, resetAt: now + windowMs };
      this.entries.set(key, entry);
    }
    entry.count += 1;
    return { ...entry };
  }

  undo(key: string): void {
    const entry = this.entries.get(key);
    if (entry && entry.count > 0) entry.count -= 1;
  }

  /** Forget every window that has ended */
  sweep(now = Date.now()): void {
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
  }

  get size(): number {
    return this.entries.size;
  }
}

/** "5 seconds", "1 minute", "3 minutes", "2 hours" */
export function waitText(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export type LimiterOptions = {
  store: RateLimitStore;
  name: string; // keeps this limiter's counts apart from the others'
  windowMs: number;
  max: number;
  /** Who is counted, or null to skip counting this request */
  key: (req: Request, res: Response) => string | null;
  message: string; // "Too many sign-in attempts."
  /** Count only failed requests: a success (status under 400) gives its count back */
  refundSuccess?: boolean;
  now?: () => number; // for tests
};

export function createLimiter(options: LimiterOptions): RequestHandler {
  const { store, name, windowMs, max, message, refundSuccess = false } = options;
  const now = options.now ?? Date.now;

  return (req: Request, res: Response, next: NextFunction) => {
    const who = options.key(req, res);
    if (who === null) return next();
    const key = `${name}:${who}`;

    const hit = store.hit(key, windowMs, now());
    const resetSeconds = Math.max(1, Math.ceil((hit.resetAt - now()) / 1000));
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, max - hit.count)));
    res.setHeader("RateLimit-Reset", String(resetSeconds));

    if (hit.count > max) {
      res.setHeader("Retry-After", String(resetSeconds));
      res.status(429).json({
        error: `${message} Try again in ${waitText(resetSeconds)}.`,
        retryAfter: resetSeconds,
      });
      return;
    }

    if (refundSuccess) {
      res.on("finish", () => {
        if (res.statusCode < 400) store.undo(key);
      });
    }
    next();
  };
}

// ---- who is counted

/** The visitor's address. Behind a proxy this is only right when trust proxy is set to its hops. */
export const ipKey = (req: Request): string => req.ip ?? "unknown";

/** The email in a login request, lower-cased, or null when there is none */
export const bodyEmailKey = (req: Request): string | null => {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  return typeof email === "string" && email.trim() !== ""
    ? email.trim().toLowerCase().slice(0, 254)
    : null;
};

/** The signed-in user, or null before sign-in */
export const userKey = (_req: Request, res: Response): string | null =>
  typeof res.locals.userId === "number" ? String(res.locals.userId) : null;

// ---- the limits

const MINUTE = 60_000;

/** All the app's limiters, built on one store. `scale` multiplies every limit (1 outside tests). */
export function createLimiters(store: RateLimitStore = new MemoryStore(), scale = 1) {
  const m = (n: number) => Math.max(1, Math.round(n * scale));
  return {
    // everything under /api, per visitor: far above normal use, only stops runaway scripts
    global: createLimiter({
      store, name: "global", windowMs: MINUTE, max: m(600), key: ipKey,
      message: "Too many requests.",
    }),
    // password guessing: failed attempts per address, and per email from any address
    loginIp: createLimiter({
      store, name: "login-ip", windowMs: 15 * MINUTE, max: m(10), key: ipKey,
      message: "Too many sign-in attempts.", refundSuccess: true,
    }),
    loginEmail: createLimiter({
      store, name: "login-email", windowMs: 15 * MINUTE, max: m(5), key: bodyEmailKey,
      message: "Too many sign-in attempts for that email.", refundSuccess: true,
    }),
    // fake account floods
    register: createLimiter({
      store, name: "register", windowMs: 60 * MINUTE, max: m(5), key: ipKey,
      message: "Too many sign-ups from this connection.",
    }),
    // signed-in use of the habits routes, per user
    user: createLimiter({
      store, name: "user", windowMs: MINUTE, max: m(300), key: userKey,
      message: "Too many requests.",
    }),
    // password change and account deletion ask for the password, so they can be guessed at too
    sensitive: createLimiter({
      store, name: "sensitive", windowMs: 15 * MINUTE, max: m(5), key: userKey,
      message: "Too many attempts.", refundSuccess: true,
    }),
  };
}
