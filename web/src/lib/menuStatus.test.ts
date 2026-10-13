import { test } from "node:test";
import assert from "node:assert/strict";
import { menuStatus } from "./menuStatus";

const TODAY = "2026-10-12"; // a Monday
const EVERY_DAY = 0b1111111;
const WEEKDAYS = 0b0011111;

const habit = (over: Partial<Parameters<typeof menuStatus>[0]> = {}) => ({
  scheduleDays: EVERY_DAY,
  target: 1,
  targetOnDate: 1,
  unit: null,
  doneOnDate: false,
  skippedOnDate: false,
  amountOnDate: null,
  ...over,
});

test("a plain habit that is not done yet", () => {
  assert.deepEqual(menuStatus(habit(), TODAY, TODAY, 3), {
    state: "Not done yet",
    about: "Every day · 3-day streak",
  });
});

test("done and skipped read in the past tense for today and for another day", () => {
  assert.equal(menuStatus(habit({ doneOnDate: true }), TODAY, TODAY, 0).state, "Done today");
  assert.equal(menuStatus(habit({ doneOnDate: true }), "2026-10-10", TODAY, 0).state, "Done that day");
  assert.equal(menuStatus(habit({ skippedOnDate: true }), TODAY, TODAY, 0).state, "Skipped today");
});

test("a counted habit shows its progress and its daily goal", () => {
  const h = habit({ target: 8, targetOnDate: 8, unit: "glasses", amountOnDate: 5 });
  assert.deepEqual(menuStatus(h, TODAY, TODAY, 0), {
    state: "5 of 8 glasses so far",
    about: "Every day · 8 glasses a day",
  });
  assert.equal(menuStatus(h, "2026-10-10", TODAY, 0).state, "5 of 8 glasses");
});

test("a counted habit with no unit says 'times'", () => {
  assert.equal(menuStatus(habit({ target: 3, targetOnDate: 3 }), TODAY, TODAY, 0).about, "Every day · 3 times a day");
});

test("a rest day and a weekday schedule", () => {
  const sunday = "2026-10-11";
  const h = habit({ scheduleDays: WEEKDAYS });
  assert.equal(menuStatus(h, sunday, TODAY, 0).state, "Rest day");
  assert.equal(menuStatus(h, TODAY, TODAY, 2).about, "Weekdays · 2-day streak");
});

test("no streak line when the streak is 0", () => {
  assert.equal(menuStatus(habit(), TODAY, TODAY, 0).about, "Every day");
});
