import { test } from "node:test";
import assert from "node:assert/strict";
import { DEV_ORIGINS, parseOrigins, productionProblems, readConfig } from "./config.js";

const GOOD_PROD = {
  NODE_ENV: "production",
  JWT_SECRET: "a".repeat(48),
  CORS_ORIGIN: "https://habbit.example",
  DATABASE_URL: "postgresql://u:p@host:5432/db",
};

test("origins are split, trimmed and stripped of trailing slashes", () => {
  assert.deepEqual(parseOrigins("https://a.app, https://b.app/ ,"), ["https://a.app", "https://b.app"]);
  assert.deepEqual(parseOrigins(undefined), []);
  assert.deepEqual(parseOrigins("  "), []);
});

test("locally, the website on port 3000 is allowed without any setting", () => {
  assert.deepEqual(readConfig({}).corsOrigins, DEV_ORIGINS);
});

test("in production nothing is allowed unless CORS_ORIGIN is set", () => {
  assert.deepEqual(readConfig({ NODE_ENV: "production" }).corsOrigins, []);
  assert.deepEqual(readConfig(GOOD_PROD).corsOrigins, ["https://habbit.example"]);
});

test("the proxy setting is a whole number of hops, and anything else means none", () => {
  assert.equal(readConfig({}).trustProxy, 0);
  assert.equal(readConfig({ TRUST_PROXY: "1" }).trustProxy, 1);
  assert.equal(readConfig({ TRUST_PROXY: "true" }).trustProxy, 0);
  assert.equal(readConfig({ TRUST_PROXY: "-1" }).trustProxy, 0);
  assert.equal(readConfig({ TRUST_PROXY: "1.5" }).trustProxy, 0);
});

test("the rate limit multiplier defaults to 1 and ignores nonsense", () => {
  assert.equal(readConfig({}).rateLimitScale, 1);
  assert.equal(readConfig({ RATE_LIMIT_MULTIPLIER: "1000" }).rateLimitScale, 1000);
  assert.equal(readConfig({ RATE_LIMIT_MULTIPLIER: "abc" }).rateLimitScale, 1);
  assert.equal(readConfig({ RATE_LIMIT_MULTIPLIER: "0" }).rateLimitScale, 1);
});

test("a good production set-up has no problems", () => {
  assert.deepEqual(productionProblems(GOOD_PROD), []);
});

test("outside production nothing is checked", () => {
  assert.deepEqual(productionProblems({}), []);
  assert.deepEqual(productionProblems({ NODE_ENV: "development", JWT_SECRET: "x" }), []);
});

test("a short or example secret stops a production start", () => {
  assert.ok(productionProblems({ ...GOOD_PROD, JWT_SECRET: "short" }).some((p) => /JWT_SECRET/.test(p)));
  assert.ok(productionProblems({ ...GOOD_PROD, JWT_SECRET: undefined }).some((p) => /JWT_SECRET/.test(p)));
  const example = "replace-with-a-long-random-string";
  assert.ok(productionProblems({ ...GOOD_PROD, JWT_SECRET: example }).some((p) => /example/.test(p)));
});

test("production needs a CORS origin, and not a wildcard", () => {
  assert.ok(productionProblems({ ...GOOD_PROD, CORS_ORIGIN: undefined }).some((p) => /CORS_ORIGIN/.test(p)));
  assert.ok(productionProblems({ ...GOOD_PROD, CORS_ORIGIN: "*" }).some((p) => /\*/.test(p)));
});

test("production needs a database, and the rate limits must not be loosened", () => {
  assert.ok(productionProblems({ ...GOOD_PROD, DATABASE_URL: undefined }).some((p) => /DATABASE_URL/.test(p)));
  assert.ok(productionProblems({ ...GOOD_PROD, RATE_LIMIT_MULTIPLIER: "50" }).some((p) => /RATE_LIMIT/.test(p)));
  assert.deepEqual(productionProblems({ ...GOOD_PROD, RATE_LIMIT_MULTIPLIER: "1" }), []);
});
