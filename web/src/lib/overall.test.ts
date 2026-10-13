import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays } from "./dates";
import { computeOverall } from "./overall";
import type { HabitHistory } from "./types";

const today = "2026-10-12"; // a Monday
const from = addDays(today, -60);
const at = (...offsets: number[]) => offsets.map((o) => addDays(today, o));

const habit = (
  id: number,
  dates: string[],
  extra: Partial<HabitHistory> = {},
): HabitHistory => ({
  id,
  name: `habit ${id}`,
  color: "volt",
  icon: null,
  scheduleDays: 0b1111111,
  target: 1,
  unit: null,
  timeOfDay: "anytime",
  createdAt: `${addDays(today, -50)}T12:00:00Z`,
  dates,
  ...extra,
});

const streaks = (habits: HabitHistory[]) => {
  const { current, best } = computeOverall(habits, today, from);
  return { current, best };
};

test("no habits means no streak", () => {
  assert.deepEqual(streaks([]), { current: 0, best: 0 });
});

test("a day is perfect only when every scheduled habit is done", () => {
  assert.deepEqual(
    streaks([habit(1, at(0, -1, -2)), habit(2, at(0, -1, -2))]),
    { current: 3, best: 3 },
  );
  // habit 2 missed yesterday, so yesterday is not perfect
  assert.deepEqual(streaks([habit(1, at(0, -1, -2)), habit(2, at(0, -2))]), {
    current: 1,
    best: 1,
  });
});

test("today still being in progress does not break the streak", () => {
  assert.deepEqual(streaks([habit(1, at(-1, -2)), habit(2, at(-1, -2))]), {
    current: 2,
    best: 2,
  });
  // half done today is still "in progress"
  assert.deepEqual(streaks([habit(1, at(0, -1, -2)), habit(2, at(-1, -2))]), {
    current: 2,
    best: 2,
  });
});

test("a habit only counts from the day it was created", () => {
  const newHabit = habit(2, at(0), { createdAt: `${today}T09:00:00Z` });
  assert.deepEqual(streaks([habit(1, at(0, -1, -2)), newHabit]), {
    current: 3,
    best: 3,
  });
});

test("days with nothing scheduled are neutral", () => {
  const weekdaysOnly = habit(1, at(-3, -4), { scheduleDays: 0b0011111 });
  assert.deepEqual(streaks([weekdaysOnly]), { current: 2, best: 2 });
});

test("best streak survives a later break", () => {
  assert.deepEqual(streaks([habit(1, [...at(0), ...at(-3, -4, -5, -6)])]), {
    current: 1,
    best: 4,
  });
});

test("per-day totals", () => {
  const { byDay } = computeOverall(
    [habit(1, at(0)), habit(2, [])],
    today,
    from,
  );
  assert.deepEqual(byDay.get(today), { scheduled: 2, done: 1 });
});

test("a skipped day is left out of that habit's count and keeps the perfect-day streak", () => {
  const a = habit(1, at(-3, -2, 0)); // missed yesterday...
  const b = habit(2, at(-3, -2, -1, 0));
  // ...but skipped it, so yesterday only counts habit b and is perfect
  const withSkip = [{ ...a, skips: at(-1) }, b];
  assert.equal(streaks(withSkip).current, 4);
  assert.equal(streaks([a, b]).current, 1);
  const { byDay } = computeOverall(withSkip, today, from);
  assert.deepEqual(byDay.get(addDays(today, -1)), { scheduled: 1, done: 1 });
});
