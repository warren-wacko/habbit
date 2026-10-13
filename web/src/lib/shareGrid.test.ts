import { test } from "node:test";
import assert from "node:assert/strict";
import { heatGridFor, lastSevenDays } from "./shareGrid";
import { addDays } from "./dates";

const TODAY = "2026-10-14"; // a Wednesday
const byDay = new Map<string, { scheduled: number; done: number }>();
for (let i = 0; i < 60; i++) byDay.set(addDays(TODAY, -i), { scheduled: 2, done: 2 });

test("the grid is six Monday-first weeks: 42 cells", () => {
  assert.equal(heatGridFor(TODAY, TODAY, byDay).length, 42);
});

test("the last week starts on the Monday of the shared day's week", () => {
  const grid = heatGridFor(TODAY, TODAY, byDay);
  // the last row is Mon 12, Tue 13, Wed 14 (today), then three days that have not happened
  assert.notEqual(grid[35], null); // Monday 12
  assert.notEqual(grid[36], null); // Tuesday 13
  assert.notEqual(grid[37], null); // Wednesday 14 = today
  assert.equal(grid[38], null); // Thursday: not yet
  assert.equal(grid[41], null); // Sunday: not yet
});

test("a past day shared shows nothing after it", () => {
  const grid = heatGridFor("2026-10-07", TODAY, byDay); // Wednesday a week earlier
  assert.notEqual(grid[37], null); // the shared Wednesday
  assert.equal(grid[38], null); // the next day is after the shared day
});

test("no data means no cells", () => {
  assert.ok(heatGridFor(TODAY, TODAY, undefined).every((c) => c === null));
});

test("the seven days end on the shared day, oldest first", () => {
  const days = lastSevenDays(TODAY);
  assert.equal(days.length, 7);
  assert.equal(days[6], TODAY);
  assert.equal(days[0], "2026-10-08");
});
