import { test } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response } from "express";
import {
  bodyEmailKey,
  createLimiter,
  createLimiters,
  ipKey,
  MemoryStore,
  userKey,
  waitText,
} from "./rateLimit.js";

// ---- tiny stand-ins for an express request and response
function fakeRes() {
  const headers: Record<string, string> = {};
  const listeners: Record<string, () => void> = {};
  const res = {
    headers,
    locals: {} as Record<string, unknown>,
    statusCode: 200,
    body: undefined as unknown,
    setHeader(k: string, v: string) {
      headers[k] = v;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(b: unknown) {
      res.body = b;
      return res;
    },
    on(event: string, fn: () => void) {
      listeners[event] = fn;
    },
    finish(code: number) {
      res.statusCode = code;
      listeners.finish?.();
    },
  };
  return res;
}
const asRes = (r: ReturnType<typeof fakeRes>) => r as unknown as Response;
const reqFrom = (ip: string, body?: unknown) => ({ ip, body }) as unknown as Request;

/** Send one request through a limiter; true when it was let through */
function attempt(limiter: ReturnType<typeof createLimiter>, req: Request, res = fakeRes()) {
  let passed = false;
  limiter(req, asRes(res), () => {
    passed = true;
  });
  return { passed, res };
}

const opts = (over = {}) => ({
  store: new MemoryStore(),
  name: "t",
  windowMs: 60_000,
  max: 3,
  key: ipKey,
  message: "Too many.",
  ...over,
});

test("requests pass until the limit, then get a 429 with a retry hint", () => {
  const limiter = createLimiter(opts());
  const req = reqFrom("1.1.1.1");
  for (let i = 0; i < 3; i++) assert.equal(attempt(limiter, req).passed, true);
  const blocked = attempt(limiter, req);
  assert.equal(blocked.passed, false);
  assert.equal(blocked.res.statusCode, 429);
  assert.equal(blocked.res.headers["Retry-After"], "60");
  assert.match((blocked.res.body as { error: string }).error, /Too many\. Try again in 1 minute\./);
  assert.equal((blocked.res.body as { retryAfter: number }).retryAfter, 60);
});

test("each visitor has their own count", () => {
  const limiter = createLimiter(opts({ max: 1 }));
  assert.equal(attempt(limiter, reqFrom("1.1.1.1")).passed, true);
  assert.equal(attempt(limiter, reqFrom("1.1.1.1")).passed, false);
  assert.equal(attempt(limiter, reqFrom("2.2.2.2")).passed, true); // someone else is unaffected
});

test("the count starts again when the window ends", () => {
  let clock = 1_000;
  const limiter = createLimiter(opts({ max: 1, windowMs: 10_000, now: () => clock }));
  const req = reqFrom("1.1.1.1");
  assert.equal(attempt(limiter, req).passed, true);
  assert.equal(attempt(limiter, req).passed, false);
  clock += 10_001;
  assert.equal(attempt(limiter, req).passed, true);
});

test("the retry hint counts down as the window runs out", () => {
  let clock = 0;
  const limiter = createLimiter(opts({ max: 1, windowMs: 60_000, now: () => clock }));
  attempt(limiter, reqFrom("1.1.1.1"));
  clock = 45_000;
  const blocked = attempt(limiter, reqFrom("1.1.1.1"));
  assert.equal(blocked.res.headers["Retry-After"], "15");
});

test("headers show the limit and what is left", () => {
  const limiter = createLimiter(opts());
  const { res } = attempt(limiter, reqFrom("1.1.1.1"));
  assert.equal(res.headers["RateLimit-Limit"], "3");
  assert.equal(res.headers["RateLimit-Remaining"], "2");
});

test("a successful request gives its count back, a failed one does not", () => {
  const limiter = createLimiter(opts({ max: 2, refundSuccess: true }));
  const req = reqFrom("1.1.1.1");
  // two failed attempts use up the limit
  for (let i = 0; i < 2; i++) {
    const { res } = attempt(limiter, req);
    res.finish(401);
  }
  assert.equal(attempt(limiter, req).passed, false);

  // someone who signs in successfully is not worn down
  const ok = createLimiter(opts({ max: 2, refundSuccess: true }));
  const other = reqFrom("3.3.3.3");
  for (let i = 0; i < 10; i++) {
    const { passed, res } = attempt(ok, other);
    assert.equal(passed, true);
    res.finish(200);
  }
});

test("a limiter can skip a request that has nothing to count", () => {
  const limiter = createLimiter(opts({ max: 1, key: () => null }));
  for (let i = 0; i < 5; i++) assert.equal(attempt(limiter, reqFrom("1.1.1.1")).passed, true);
});

test("limiters with different names do not share counts", () => {
  const store = new MemoryStore();
  const a = createLimiter(opts({ store, name: "a", max: 1 }));
  const b = createLimiter(opts({ store, name: "b", max: 1 }));
  const req = reqFrom("1.1.1.1");
  assert.equal(attempt(a, req).passed, true);
  assert.equal(attempt(a, req).passed, false);
  assert.equal(attempt(b, req).passed, true);
});

test("the keys: address, email in the body, and signed-in user", () => {
  assert.equal(ipKey(reqFrom("9.9.9.9")), "9.9.9.9");
  assert.equal(bodyEmailKey(reqFrom("x", { email: "  Sam@Example.com " })), "sam@example.com");
  assert.equal(bodyEmailKey(reqFrom("x", { email: "" })), null);
  assert.equal(bodyEmailKey(reqFrom("x", { email: 5 })), null);
  assert.equal(bodyEmailKey(reqFrom("x", undefined)), null);
  assert.equal(bodyEmailKey(reqFrom("x", { email: "a".repeat(400) }))?.length, 254);
  const res = fakeRes();
  assert.equal(userKey(reqFrom("x"), asRes(res)), null);
  res.locals.userId = 7;
  assert.equal(userKey(reqFrom("x"), asRes(res)), "7");
});

test("wait times read naturally", () => {
  assert.equal(waitText(1), "1 second");
  assert.equal(waitText(45), "45 seconds");
  assert.equal(waitText(60), "1 minute");
  assert.equal(waitText(61), "2 minutes");
  assert.equal(waitText(15 * 60), "15 minutes");
  assert.equal(waitText(3600), "1 hour");
  assert.equal(waitText(7200), "2 hours");
});

test("the store forgets ended windows and stays within its size", () => {
  const store = new MemoryStore(3);
  store.hit("a", 1000, 0);
  store.hit("b", 1000, 0);
  store.hit("c", 1000, 0);
  assert.equal(store.size, 3);
  store.hit("d", 1000, 5000); // a, b and c have ended: they are swept to make room
  assert.equal(store.size, 1);

  const full = new MemoryStore(2);
  full.hit("a", 10_000, 0);
  full.hit("b", 10_000, 0);
  full.hit("c", 10_000, 1); // all live: the oldest is dropped, the size never grows
  assert.equal(full.size, 2);
});

test("undo never takes a count below zero", () => {
  const store = new MemoryStore();
  store.hit("a", 1000, 0);
  store.undo("a");
  store.undo("a");
  assert.equal(store.hit("a", 1000, 1).count, 1);
});

test("the app's limits: ten failed logins per address, five per email, five sign-ups", () => {
  const limiters = createLimiters(new MemoryStore(), 1);
  const ip = reqFrom("1.1.1.1", { email: "a@example.com" });
  let blockedAt = 0;
  for (let i = 1; i <= 12; i++) {
    const r = fakeRes();
    let passed = false;
    limiters.loginIp(ip, asRes(r), () => (passed = true));
    if (!passed && !blockedAt) blockedAt = i;
    if (passed) r.finish(401);
  }
  assert.equal(blockedAt, 11);

  // the email limit trips at the 6th attempt even from different addresses
  const byEmail = createLimiters(new MemoryStore(), 1);
  let emailBlockedAt = 0;
  for (let i = 1; i <= 8; i++) {
    const r = fakeRes();
    let passed = false;
    byEmail.loginEmail(reqFrom(`10.0.0.${i}`, { email: "target@example.com" }), asRes(r), () => (passed = true));
    if (!passed && !emailBlockedAt) emailBlockedAt = i;
    if (passed) r.finish(401);
  }
  assert.equal(emailBlockedAt, 6);

  const signups = createLimiters(new MemoryStore(), 1);
  let registerBlockedAt = 0;
  for (let i = 1; i <= 7; i++) {
    const r = fakeRes();
    let passed = false;
    signups.register(reqFrom("5.5.5.5"), asRes(r), () => (passed = true));
    if (!passed && !registerBlockedAt) registerBlockedAt = i;
    if (passed) r.finish(201); // even successful sign-ups count
  }
  assert.equal(registerBlockedAt, 6);
});

test("the scale multiplies the limits, for testing only", () => {
  const limiters = createLimiters(new MemoryStore(), 100);
  const ip = reqFrom("1.1.1.1");
  for (let i = 0; i < 500; i++) {
    const r = fakeRes();
    let passed = false;
    limiters.register(ip, asRes(r), () => (passed = true));
    assert.equal(passed, true);
  }
});
