import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dayQuery,
  exportQuery,
  habitBody,
  HABIT_COLORS,
  HABIT_ICON_KEYS,
  habitUpdateBody,
  historyQuery,
  insightsQuery,
  statsQuery,
} from "./habit.js";

const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) =>
  schema.safeParse(v).success;

test("create: name only, and a fully styled habit", () => {
  assert.ok(ok(habitBody, { name: "Run" }));
  assert.ok(
    ok(habitBody, { name: "Run", color: "rose", icon: "run", scheduleDays: 31 }),
  );
});

test("create: rejects bad colour, non-emoji icon and impossible schedules", () => {
  assert.ok(!ok(habitBody, { name: "Run", color: "red" }));
  assert.ok(!ok(habitBody, { name: "Run", color: "yellow" })); // the old name
  assert.ok(!ok(habitBody, { name: "Run", icon: "abc" }));
  assert.ok(!ok(habitBody, { name: "Run", icon: "🏃" })); // emoji are no longer stored
  assert.ok(!ok(habitBody, { name: "Run", scheduleDays: 0 })); // needs a day
  assert.ok(!ok(habitBody, { name: "Run", scheduleDays: 128 }));
  assert.ok(!ok(habitBody, { name: "   " }));
});

test("create: every icon key and every colour is accepted", () => {
  for (const icon of HABIT_ICON_KEYS) assert.ok(ok(habitBody, { name: "x", icon }), icon);
  for (const color of HABIT_COLORS) assert.ok(ok(habitBody, { name: "x", color }), color);
});

test("update: a rename-only body still works", () => {
  assert.ok(ok(habitUpdateBody, { name: "New name" }));
});

test("update: icon can be cleared with null, and habits can be archived", () => {
  assert.ok(ok(habitUpdateBody, { icon: null }));
  assert.ok(ok(habitUpdateBody, { archived: true }));
  assert.ok(ok(habitUpdateBody, { archived: false }));
});

test("update: rejects an empty body, a blank name and a non-boolean archived", () => {
  assert.ok(!ok(habitUpdateBody, {}));
  assert.ok(!ok(habitUpdateBody, { name: "   " }));
  assert.ok(!ok(habitUpdateBody, { archived: "yes" }));
});

test("list query: archived must be true or false", () => {
  assert.ok(ok(dayQuery, { archived: "true" }));
  assert.ok(ok(dayQuery, { date: "2026-10-12" }));
  assert.ok(!ok(dayQuery, { archived: "maybe" }));
  assert.ok(!ok(dayQuery, { date: "12/10/2026" }));
});

test("stats query: days default to 7 and the caller's today is optional", () => {
  assert.equal(statsQuery.parse({}).days, 7);
  assert.equal(statsQuery.parse({ days: "30", today: "2026-10-12" }).today, "2026-10-12");
  assert.ok(!ok(statsQuery, { days: 0 }));
  assert.ok(!ok(statsQuery, { days: 366 }));
  assert.ok(!ok(statsQuery, { today: "tomorrow" }));
});

test("history query: ordered, valid range of at most a year", () => {
  assert.ok(ok(historyQuery, { from: "2026-01-01", to: "2026-10-12" }));
  assert.ok(!ok(historyQuery, { from: "2026-10-12", to: "2026-01-01" }));
  assert.ok(!ok(historyQuery, { from: "2024-01-01", to: "2026-10-12" })); // > 366 days
});

test("history query: archived must be true or false", () => {
  assert.ok(ok(historyQuery, { from: "2026-01-01", to: "2026-10-12", archived: "true" }));
  assert.ok(!ok(historyQuery, { from: "2026-01-01", to: "2026-10-12", archived: "maybe" }));
});

test("export query: json by default, csv allowed, anything else rejected", () => {
  assert.equal(exportQuery.parse({}).format, "json");
  assert.equal(exportQuery.parse({ format: "csv" }).format, "csv");
  assert.ok(!ok(exportQuery, { format: "xml" }));
});

test("insights query: at least 60 days so the trend has something to compare", () => {
  assert.equal(insightsQuery.parse({}).days, 90);
  assert.ok(ok(insightsQuery, { days: 60, today: "2026-10-12" }));
  assert.ok(ok(insightsQuery, { days: 365 }));
  assert.ok(!ok(insightsQuery, { days: 59 }));
  assert.ok(!ok(insightsQuery, { days: 366 }));
  assert.ok(!ok(insightsQuery, { today: "tomorrow" }));
});
