import { test } from "node:test";
import assert from "node:assert/strict";
import { isNearToday, isOnOrAfterHabitStart, isTickableDay, scheduledDaysInWindow, shiftDay, toDbDate, weekdayIndex } from "./dates.js";

const EVERY_DAY = 0b1111111;
const WEEKDAYS = 0b0011111; // Mon-Fri
const MON_WED_FRI = 0b0010101;

test("shiftDay moves across month and year boundaries", () => {
  assert.equal(shiftDay("2026-10-12", -1), "2026-10-11");
  assert.equal(shiftDay("2026-10-01", -1), "2026-09-30");
  assert.equal(shiftDay("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftDay("2026-02-28", 1), "2026-03-01");
  assert.equal(shiftDay("2028-02-28", 1), "2028-02-29"); // leap year
  assert.equal(shiftDay("2026-10-12", 0), "2026-10-12");
});

test("weekdayIndex counts Monday as 0 and Sunday as 6", () => {
  assert.equal(weekdayIndex("2026-10-12"), 0); // Monday
  assert.equal(weekdayIndex("2026-10-14"), 2); // Wednesday
  assert.equal(weekdayIndex("2026-10-18"), 6); // Sunday
});

test("scheduledDaysInWindow counts only the scheduled days", () => {
  // the 7 days ending Sunday 2026-10-18 are exactly Mon..Sun
  assert.equal(scheduledDaysInWindow("2026-10-18", 7, EVERY_DAY), 7);
  assert.equal(scheduledDaysInWindow("2026-10-18", 7, WEEKDAYS), 5);
  assert.equal(scheduledDaysInWindow("2026-10-18", 7, MON_WED_FRI), 3);
});

test("scheduledDaysInWindow depends on the caller's today, not the server's clock", () => {
  // window ending Monday: Tue..Mon, so Mon-Fri habits get 5 again but a Monday-only habit gets 1
  assert.equal(scheduledDaysInWindow("2026-10-12", 7, 0b0000001), 1);
  // a one-day window on a rest day
  assert.equal(scheduledDaysInWindow("2026-10-18", 1, WEEKDAYS), 0);
  assert.equal(scheduledDaysInWindow("2026-10-16", 1, WEEKDAYS), 1);
});

test("toDbDate is midnight UTC for that calendar day", () => {
  assert.equal(toDbDate("2026-10-12").toISOString(), "2026-10-12T00:00:00.000Z");
});

test("isTickableDay allows up to a year back and one day ahead, nothing else", () => {
  const now = new Date("2026-10-12T10:00:00.000Z");
  assert.equal(isTickableDay("2026-10-12", now), true);
  assert.equal(isTickableDay("2026-10-13", now), true); // a timezone ahead of UTC
  assert.equal(isTickableDay("2026-10-14", now), false);
  assert.equal(isTickableDay("2025-10-12", now), true); // exactly 365 days back
  assert.equal(isTickableDay("2025-10-11", now), false);
  assert.equal(isTickableDay("2099-01-01", now), false);
  assert.equal(isTickableDay("1900-01-01", now), false);
});

test("isNearToday allows the caller's today to be a day either side of the server's", () => {
  const now = new Date("2026-10-12T10:00:00.000Z");
  assert.equal(isNearToday("2026-10-11", now), true);
  assert.equal(isNearToday("2026-10-12", now), true);
  assert.equal(isNearToday("2026-10-13", now), true);
  assert.equal(isNearToday("2026-10-14", now), false);
  assert.equal(isNearToday("2026-10-10", now), false);
});

test("a habit cannot be used before the day it was created, with a day of slack", () => {
  const created = new Date("2026-10-14T09:00:00.000Z");
  assert.equal(isOnOrAfterHabitStart("2026-10-14", created), true); // the day it was made
  assert.equal(isOnOrAfterHabitStart("2026-10-15", created), true);
  assert.equal(isOnOrAfterHabitStart("2026-10-13", created), true); // slack for a timezone behind UTC
  assert.equal(isOnOrAfterHabitStart("2026-10-12", created), false);
  assert.equal(isOnOrAfterHabitStart("2025-10-14", created), false);
});

test("a habit made late in the evening in a timezone behind UTC can still be ticked that evening", () => {
  // 8pm on Oct 13 in UTC-8 is 04:00 UTC on Oct 14; the user's own date is still Oct 13
  const created = new Date("2026-10-14T04:00:00.000Z");
  assert.equal(isOnOrAfterHabitStart("2026-10-13", created), true);
});
