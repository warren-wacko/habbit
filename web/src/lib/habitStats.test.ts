import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays } from "./dates";
import { habitDetailStats, monthGrid, streakRuns, type HabitInput } from "./habitStats";

const TODAY = "2026-10-12"; // a Monday
const FROM = addDays(TODAY, -364);
const at = (n: number) => addDays(TODAY, n);
const EVERY_DAY = 0b1111111;
const WEEKDAYS = 0b0011111;

const habit = (over: Partial<HabitInput> & { done?: number[] } = {}): HabitInput => ({
  scheduleDays: over.scheduleDays ?? EVERY_DAY,
  created: over.created ?? at(-60),
  dates: over.dates ?? new Set((over.done ?? []).map(at)),
});

test("detail stats for a habit done every day for ten days", () => {
  const h = habit({ done: [0, -1, -2, -3, -4, -5, -6, -7, -8, -9] });
  const s = habitDetailStats(h, TODAY, FROM);
  assert.equal(s.current, 10);
  assert.equal(s.best, 10);
  assert.equal(s.checkIns, 10);
  assert.equal(s.done30, 10);
  assert.equal(s.rate30, 10 / 30);
  assert.equal(s.missed30, 20); // 30 days minus the 10 done, today never counts as missed
});

test("today not being done yet is not a miss", () => {
  const h = habit({ done: [-1, -2, -3] });
  const s = habitDetailStats(h, TODAY, FROM);
  assert.equal(s.current, 3);
  assert.equal(s.missed30, 30 - 1 - 3); // 30 days, minus today (still open), minus 3 done
});

test("a habit only counts from the day it was created", () => {
  const h = habit({ created: at(-4), done: [-1, -2] });
  const s = habitDetailStats(h, TODAY, FROM);
  // counted days: -4..0 = 5 days, done 2, today still open
  assert.equal(s.rate30, 2 / 5);
  assert.equal(s.missed30, 2); // days -4 and -3
});

test("rest days do not count against a weekly habit", () => {
  const h = habit({ scheduleDays: WEEKDAYS, done: [-3, -4, -5] });
  const s = habitDetailStats(h, TODAY, FROM);
  assert.equal(s.current, 3); // Fri, Thu, Wed; the weekend is skipped
});

test("streakRuns lists every run, newest first, and marks the ongoing one", () => {
  // done: oct 1-5 (-11..-7), miss oct 6-7, done oct 8-11 (-4..-1), today pending
  const h = habit({ done: [-11, -10, -9, -8, -7, -4, -3, -2, -1] });
  const runs = streakRuns(h, TODAY, FROM);
  assert.deepEqual(runs, [
    { start: at(-4), end: at(-1), length: 4, ongoing: true },
    { start: at(-11), end: at(-7), length: 5, ongoing: false },
  ]);
});

test("streakRuns: a missed day yesterday closes the run", () => {
  const h = habit({ done: [-4, -3, -2] }); // yesterday missed
  const runs = streakRuns(h, TODAY, FROM);
  assert.deepEqual(runs, [{ start: at(-4), end: at(-2), length: 3, ongoing: false }]);
});

test("streakRuns: rest days sit inside a run without breaking it", () => {
  // weekdays: Thu Oct 8 (-4), Fri Oct 9 (-3), skip the weekend, Mon today
  const h = habit({ scheduleDays: WEEKDAYS, done: [-4, -3, 0] });
  const runs = streakRuns(h, TODAY, FROM);
  assert.deepEqual(runs, [{ start: at(-4), end: at(0), length: 3, ongoing: true }]);
});

test("streakRuns of a habit with no completions is empty", () => {
  assert.deepEqual(streakRuns(habit(), TODAY, FROM), []);
});

test("monthGrid: October 2026 starts on a Thursday and has 31 days", () => {
  const { leading, cells } = monthGrid(2026, 10, habit({ scheduleDays: WEEKDAYS }), TODAY);
  assert.equal(leading, 3); // Mon, Tue, Wed blank
  assert.equal(cells.length, 31);
});

test("monthGrid states: done, missed, rest, today, future", () => {
  // weekdays only; done Oct 1, 2 (Thu, Fri) and Oct 6, 7, 8, 9; missed Oct 5; today Oct 12 not done
  const dates = new Set(["2026-10-01", "2026-10-02", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09"]);
  const { cells } = monthGrid(2026, 10, habit({ scheduleDays: WEEKDAYS, created: "2026-08-03", dates }), TODAY);
  const state = (day: number) => cells[day - 1].state;
  assert.equal(state(1), "hit");
  assert.equal(state(3), "off"); // Saturday
  assert.equal(state(5), "miss"); // Monday, not done
  assert.equal(state(6), "hit");
  assert.equal(state(12), "pending"); // today, still open
  assert.equal(cells[11].today, true);
  assert.equal(state(13), "future");
});

test("monthGrid: days before the habit existed are 'before', and a done rest day is a hit", () => {
  const dates = new Set(["2026-10-10"]); // a Saturday, a rest day
  const { cells } = monthGrid(
    2026,
    10,
    { scheduleDays: WEEKDAYS, created: "2026-10-06", dates },
    TODAY,
  );
  assert.equal(cells[0].state, "before"); // Oct 1
  assert.equal(cells[9].state, "hit"); // Oct 10, done on a rest day
});

test("skipped days are not misses and stay out of the rate", () => {
  const h = habit({ created: at(-4), done: [-1, -3], skips: undefined });
  const withSkip: HabitInput = { ...h, skips: new Set([at(-2), at(-4)]) };
  const s = habitDetailStats(withSkip, TODAY, FROM);
  // counted days -3..0 = 4 (the two skipped ones drop out of -4..0), done 2, today still open
  assert.equal(s.rate30, 2 / 3);
  assert.equal(s.missed30, 0);
  const cells = monthGrid(2026, 10, withSkip, TODAY).cells;
  assert.equal(cells.find((c) => c.date === at(-2))?.state, "skip");
  assert.equal(cells.find((c) => c.date === at(-3))?.state, "hit");
});
