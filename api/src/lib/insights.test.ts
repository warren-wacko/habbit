import { test } from "node:test";
import assert from "node:assert/strict";
import { shiftDay, weekdayIndex } from "./dates.js";
import { computeInsights, type InsightHabit } from "./insights.js";

const TODAY = "2026-10-12"; // a Monday
const EVERY_DAY = 0b1111111;

const lastDays = (n: number) =>
  Array.from({ length: n }, (_, i) => shiftDay(TODAY, -i));

const habit = (
  id: number,
  dates: string[],
  extra: Partial<InsightHabit> = {},
): InsightHabit => ({
  id,
  name: `habit ${id}`,
  icon: null,
  scheduleDays: EVERY_DAY,
  created: shiftDay(TODAY, -200),
  dates: new Set(dates),
  ...extra,
});

test("totals count every scheduled day in the window", () => {
  const out = computeInsights([habit(1, lastDays(90))], TODAY, 90);
  assert.equal(out.totals.scheduled, 90);
  assert.equal(out.totals.done, 90);
  assert.equal(out.totals.rate, 1);
});

test("finds the strongest and weakest weekday", () => {
  const mondays = lastDays(90).filter((d) => weekdayIndex(d) === 0);
  const out = computeInsights([habit(1, mondays)], TODAY, 90);
  assert.equal(out.bestWeekday?.name, "Monday");
  assert.equal(out.bestWeekday?.rate, 1);
  // every other weekday is 0, and ties go to the earliest one
  assert.equal(out.worstWeekday?.name, "Tuesday");
  assert.equal(out.worstWeekday?.rate, 0);
});

test("no best or worst when every day is equally good", () => {
  const out = computeInsights([habit(1, lastDays(90))], TODAY, 90);
  assert.equal(out.bestWeekday, null);
  assert.equal(out.worstWeekday, null);
});

test("says nothing about weekdays until there is enough data", () => {
  const young = habit(1, lastDays(2), { created: shiftDay(TODAY, -2) });
  const out = computeInsights([young], TODAY, 90);
  assert.equal(out.bestWeekday, null);
  assert.equal(out.worstWeekday, null);
});

test("a habit only counts from the day it was created", () => {
  const out = computeInsights(
    [habit(1, [], { created: shiftDay(TODAY, -9) })],
    TODAY,
    90,
  );
  assert.equal(out.totals.scheduled, 10); // today and the 9 days before
});

test("rest days are not counted against a habit", () => {
  const weekdaysOnly = habit(1, [], { scheduleDays: 0b0011111 });
  const out = computeInsights([weekdaysOnly], TODAY, 70);
  // 70 days is exactly 10 weeks, so exactly 50 weekdays
  assert.equal(out.totals.scheduled, 50);
  assert.equal(out.weekdays[5].scheduled, 0); // Saturday
  assert.equal(out.weekdays[6].scheduled, 0); // Sunday
});

test("trend compares the last 30 days with the 30 before", () => {
  const out = computeInsights([habit(1, lastDays(30))], TODAY, 90);
  assert.equal(out.trend.current.rate, 1);
  assert.equal(out.trend.previous.rate, 0);
  assert.equal(out.trend.changePoints, 100);
});

test("trend change is null when there is no earlier period to compare", () => {
  const young = habit(1, lastDays(10), { created: shiftDay(TODAY, -9) });
  const out = computeInsights([young], TODAY, 90);
  assert.equal(out.trend.previous.rate, null);
  assert.equal(out.trend.changePoints, null);
});

test("finds the strongest and weakest habit", () => {
  const out = computeInsights(
    [habit(1, lastDays(90)), habit(2, []), habit(3, lastDays(45))],
    TODAY,
    90,
  );
  assert.equal(out.strongestHabit?.id, 1);
  assert.equal(out.weakestHabit?.id, 2);
  assert.equal(out.habits.find((h) => h.id === 3)?.rate, 0.5);
});

test("a single habit has a strongest but no weakest", () => {
  const out = computeInsights([habit(1, lastDays(30))], TODAY, 90);
  // one habit: best equals worst, so neither is reported
  assert.equal(out.strongestHabit, null);
  assert.equal(out.weakestHabit, null);
});

test("no habits gives an empty, safe result", () => {
  const out = computeInsights([], TODAY, 90);
  assert.equal(out.totals.rate, null);
  assert.equal(out.bestWeekday, null);
  assert.equal(out.trend.changePoints, null);
  assert.deepEqual(out.habits, []);
});

test("a skipped day counts neither for nor against a habit, but a done day always counts", () => {
  const habit = {
    id: 1,
    name: "Read",
    icon: null,
    scheduleDays: 0b1111111,
    created: "2026-10-01",
    dates: new Set(["2026-10-11"]),
    skips: new Set(["2026-10-10", "2026-10-11"]), // the 11th is done, so it still counts
  };
  const r = computeInsights([habit], "2026-10-12", 60);
  // 12 days since creation (Oct 1..12), minus the one skipped, not-done day
  assert.equal(r.totals.scheduled, 11);
  assert.equal(r.totals.done, 1);
});
