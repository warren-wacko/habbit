import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays } from "./dates";
import { computeStreaks } from "./streaks";

const today = "2026-10-12"; // a Monday
const from = addDays(today, -364);
const days = (...offsets: number[]) =>
  new Set(offsets.map((o) => addDays(today, o)));
const WEEKDAYS = 0b0011111;

test("no completions means no streak", () => {
  assert.deepEqual(computeStreaks(new Set(), today, from), { current: 0, best: 0 });
});

test("counts consecutive days including today", () => {
  assert.deepEqual(computeStreaks(days(0, -1, -2), today, from), {
    current: 3,
    best: 3,
  });
});

test("today not done yet keeps the streak alive", () => {
  assert.deepEqual(computeStreaks(days(-1, -2, -3), today, from), {
    current: 3,
    best: 3,
  });
});

test("a gap ends the current streak but best is remembered", () => {
  assert.deepEqual(computeStreaks(days(0, -1, -3, -4, -5, -6), today, from), {
    current: 2,
    best: 4,
  });
});

test("missing yesterday resets the current streak to 0", () => {
  assert.deepEqual(computeStreaks(days(-2, -3), today, from), {
    current: 0,
    best: 2,
  });
});

test("rest days neither extend nor break a streak", () => {
  // Fri, Thu, Wed done; Sat and Sun are off; today (Mon) not done yet
  assert.deepEqual(
    computeStreaks(days(-3, -4, -5), today, from, WEEKDAYS),
    { current: 3, best: 3 },
  );
});

test("missing a scheduled day still breaks it", () => {
  // Thu and Wed done but Fri was missed
  assert.deepEqual(computeStreaks(days(-4, -5), today, from, WEEKDAYS), {
    current: 0,
    best: 2,
  });
});

test("a skipped day neither breaks nor extends a streak", () => {
  const today = "2026-10-12";
  const from = "2026-10-01";
  // done Oct 8, 9, 11; the 10th was skipped; today (12th) is still open
  const dates = new Set(["2026-10-08", "2026-10-09", "2026-10-11"]);
  const skips = new Set(["2026-10-10"]);
  assert.deepEqual(computeStreaks(dates, today, from, 0b1111111, skips), { current: 3, best: 3 });
  // without the skip the 10th is a miss and the streak is only the 11th
  assert.deepEqual(computeStreaks(dates, today, from, 0b1111111), { current: 1, best: 2 });
});

test("a skip on a day that was done anyway does not count as a skip", () => {
  const dates = new Set(["2026-10-10", "2026-10-11"]);
  const skips = new Set(["2026-10-10"]);
  assert.equal(computeStreaks(dates, "2026-10-11", "2026-10-01", 0b1111111, skips).current, 2);
});
