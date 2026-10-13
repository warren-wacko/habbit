// The API as it runs in production: security headers, CORS, the start-up checks and the real
// rate limits (the other test files loosen the limits so they can create many accounts).
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  client,
  newVisitor,
  removeTestUsers,
  signUp,
  startApi,
  startApiExpectingFailure,
  TEST_PASSWORD,
  type Call,
  type RunningApi,
} from "./helpers.js";

const SITE = "http://localhost:3999";
let api: RunningApi;
let call: Call;

before(async () => {
  await removeTestUsers();
  api = await startApi({ NODE_ENV: "production", RATE_LIMIT_MULTIPLIER: "1", CORS_ORIGIN: SITE });
  call = client(api.base);
});

after(async () => {
  await api.stop();
  await removeTestUsers();
});

describe("security headers", () => {
  it("sets the protective headers and does not announce the framework", async () => {
    const r = await call("GET", "/api/health");
    assert.equal(r.headers.get("x-powered-by"), null);
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.equal(r.headers.get("x-frame-options"), "DENY");
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.match(r.headers.get("strict-transport-security") ?? "", /max-age=\d+/);
  });
});

describe("CORS", () => {
  const preflight = { "access-control-request-method": "GET", "access-control-request-headers": "authorization" };

  it("allows the website's address and nobody else", async () => {
    const allowed = await call("OPTIONS", "/api/habits", { origin: SITE, headers: preflight });
    assert.equal(allowed.headers.get("access-control-allow-origin"), SITE);
    const refused = await call("OPTIONS", "/api/habits", { origin: "http://evil.example", headers: preflight });
    assert.equal(refused.headers.get("access-control-allow-origin"), null);
    const plain = await call("GET", "/api/health", { origin: "http://evil.example" });
    assert.equal(plain.headers.get("access-control-allow-origin"), null);
  });
});

describe("refusing an unsafe production start", () => {
  it("will not start with a short secret and no CORS origin", async () => {
    const r = await startApiExpectingFailure({ NODE_ENV: "production", JWT_SECRET: "short", CORS_ORIGIN: "" });
    assert.equal(r.code, 1);
    assert.match(r.output, /JWT_SECRET must be at least 32 characters/);
    assert.match(r.output, /CORS_ORIGIN must be set/);
  });

  it("will not start with the example secret, a wildcard origin, or loosened rate limits", async () => {
    const r = await startApiExpectingFailure({
      NODE_ENV: "production",
      JWT_SECRET: "replace-with-a-long-random-string",
      CORS_ORIGIN: "*",
      RATE_LIMIT_MULTIPLIER: "50",
    });
    assert.equal(r.code, 1);
    assert.match(r.output, /example value/);
    assert.match(r.output, /must not be \*/);
    assert.match(r.output, /RATE_LIMIT_MULTIPLIER/);
  });
});

describe("the real rate limits", () => {
  it("blocks the 11th failed login from one address, with a hint for when to retry", async () => {
    const ip = newVisitor();
    let blockedAt = 0;
    let last;
    for (let i = 1; i <= 12; i++) {
      last = await call("POST", "/api/auth/login", { ip, body: { email: `nobody${i}@example.invalid`, password: "wrong-password" } });
      if (last.status === 429 && !blockedAt) blockedAt = i;
    }
    assert.equal(blockedAt, 11);
    assert.match(last!.json.error, /Try again in \d+ minutes?/);
    assert.ok(Number(last!.headers.get("retry-after")) > 0);
    const user = await signUp(call);
    const other = await call("POST", "/api/auth/login", { body: { email: user.email, password: user.password } });
    assert.equal(other.status, 200, "a different visitor is not affected");
  });

  it("cannot be dodged by faking extra forwarded addresses", async () => {
    const real = newVisitor();
    let blockedAt = 0;
    for (let i = 1; i <= 12; i++) {
      const r = await call("POST", "/api/auth/login", {
        headers: { "x-forwarded-for": `${i}.${i}.${i}.${i}, ${real}` },
        body: { email: `spoof${i}@example.invalid`, password: "wrong-password" },
      });
      if (r.status === 429 && !blockedAt) blockedAt = i;
    }
    assert.equal(blockedAt, 11);
  });

  it("blocks the 6th failed login for one email from any address, but not other emails", async () => {
    const user = await signUp(call);
    const victim = `victim${Date.now()}@example.invalid`;
    let blockedAt = 0;
    for (let i = 1; i <= 8; i++) {
      const r = await call("POST", "/api/auth/login", { body: { email: victim, password: "wrong-password" } });
      if (r.status === 429 && !blockedAt) blockedAt = i;
    }
    assert.equal(blockedAt, 6);
    assert.equal((await call("POST", "/api/auth/login", { body: { email: user.email, password: user.password } })).status, 200);
  });

  it("does not count successful logins", async () => {
    const user = await signUp(call);
    const ip = newVisitor();
    let ok = 0;
    for (let i = 0; i < 14; i++) {
      const r = await call("POST", "/api/auth/login", { ip, body: { email: user.email, password: user.password } });
      if (r.status === 200) ok++;
    }
    assert.equal(ok, 14);
  });

  it("blocks the 6th sign-up from one address", async () => {
    const ip = newVisitor();
    let blockedAt = 0;
    for (let i = 1; i <= 7; i++) {
      const r = await call("POST", "/api/auth/register", { ip, body: { email: `flood${i}-${Date.now()}@example.invalid`, password: TEST_PASSWORD } });
      if (r.status === 429 && !blockedAt) blockedAt = i;
    }
    assert.equal(blockedAt, 6);
  });

  it("blocks the 6th wrong-password change, and keeps normal signed-in use free", async () => {
    const user = await signUp(call);
    let blockedAt = 0;
    for (let i = 1; i <= 7; i++) {
      const r = await call("PATCH", "/api/auth/password", { token: user.token, body: { currentPassword: "not-my-password", newPassword: "Another-pass-456" } });
      if (r.status === 429 && !blockedAt) blockedAt = i;
    }
    assert.equal(blockedAt, 6);

    const ip = newVisitor();
    let fine = 0;
    for (let i = 0; i < 40; i++) {
      const r = await call("GET", `/api/habits?date=${new Date().toISOString().slice(0, 10)}`, { token: user.token, ip });
      if (r.status === 200) fine++;
    }
    assert.equal(fine, 40);
  });

  it("blocks the 601st request in a minute from one address, and only that address", async () => {
    const ip = newVisitor();
    let blockedAt = 0;
    for (let i = 1; i <= 605; i++) {
      const r = await call("GET", "/api/health", { ip });
      if (r.status === 429) {
        blockedAt = i;
        break;
      }
    }
    assert.equal(blockedAt, 601);
    assert.equal((await call("GET", "/api/health")).status, 200);
  });
});
