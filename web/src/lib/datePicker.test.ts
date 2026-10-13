import { test } from "node:test";
import assert from "node:assert/strict";
import { monthInRange, pickerMonth, shiftMonth } from "./datePicker";

const TODAY = "2026-10-12"; // a Monday
const MIN = "2025-10-14"; // 364 days earlier

test("a month starts on the right weekday, Monday first", () => {
  // Oct 1 2026 is a Thursday: three blanks (Mon, Tue, Wed)
  const { leading, cells } = pickerMonth(2026, 10, TODAY, MIN);
  assert.equal(leading, 3);
  assert.equal(cells.length, 31);
  assert.equal(cells[0].date, "2026-10-01");
  assert.equal(cells[30].date, "2026-10-31");
});

test("days after today are disabled and today is marked", () => {
  const { cells } = pickerMonth(2026, 10, TODAY, MIN);
  assert.equal(cells.find((c) => c.date === TODAY)?.today, true);
  assert.equal(cells.find((c) => c.date === TODAY)?.disabled, false);
  assert.equal(cells.find((c) => c.date === "2026-10-13")?.disabled, true);
  assert.equal(cells.find((c) => c.date === "2026-10-11")?.disabled, false);
});

test("days before the oldest editable day are disabled", () => {
  const { cells } = pickerMonth(2025, 10, TODAY, MIN);
  assert.equal(cells.find((c) => c.date === "2025-10-13")?.disabled, true);
  assert.equal(cells.find((c) => c.date === "2025-10-14")?.disabled, false);
});

test("a leap-year February has 29 days and a month starting on Monday has no blanks", () => {
  assert.equal(pickerMonth(2028, 2, "2028-12-31", "2020-01-01").cells.length, 29);
  // June 1 2026 is a Monday
  assert.equal(pickerMonth(2026, 6, TODAY, MIN).leading, 0);
});

test("only months between the oldest day and today can be shown", () => {
  assert.equal(monthInRange(2026, 10, TODAY, MIN), true);
  assert.equal(monthInRange(2026, 11, TODAY, MIN), false); // after today's month
  assert.equal(monthInRange(2025, 10, TODAY, MIN), true); // the oldest month
  assert.equal(monthInRange(2025, 9, TODAY, MIN), false); // before it
});

test("shiftMonth rolls over the year both ways", () => {
  assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
  assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
  assert.deepEqual(shiftMonth(2026, 10, -1), { year: 2026, month: 9 });
});
