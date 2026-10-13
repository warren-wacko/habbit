import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays } from "./dates";
import {
  dailyBars,
  dayRate,
  heatLevel,
  monthLabels,
  monthlyBars,
  periodDelta,
  windowTotals,
  type ByDay,
  type DayTotals,
} from "./stats";

const TODAY = "2026-10-12"; // a Monday
const at = (n: number) => addDays(TODAY, n);

// build a ByDay map from [offset from today, scheduled, done]
const byDay = (rows: [number, number, number][]): ByDay =>
  new Map<string, DayTotals>(rows.map(([o, s, d]) => [at(o), { scheduled: s, done: d }]));

test("dayRate is null when nothing was scheduled", () => {
  assert.equal(dayRate(undefined), null);
  assert.equal(dayRate({ scheduled: 0, done: 0 }), null);
  assert.equal(dayRate({ scheduled: 4, done: 1 }), 0.25);
});

test("heatLevel: none, under half, over half, everything", () => {
  assert.equal(heatLevel(undefined), 0);
  assert.equal(heatLevel({ scheduled: 4, done: 0 }), 0);
  assert.equal(heatLevel({ scheduled: 4, done: 1 }), 1);
  assert.equal(heatLevel({ scheduled: 4, done: 2 }), 2);
  assert.equal(heatLevel({ scheduled: 4, done: 3 }), 2);
  assert.equal(heatLevel({ scheduled: 4, done: 4 }), 3);
});

test("windowTotals adds up only the active days inside the window", () => {
  const m = byDay([
    [0, 4, 4], // perfect
    [-1, 4, 2],
    [-2, 0, 0], // nothing scheduled
    [-3, 2, 2], // perfect
    [-9, 5, 5], // outside a 7 day window
  ]);
  assert.deepEqual(windowTotals(m, TODAY, 7), {
    scheduled: 10,
    done: 8,
    rate: 0.8,
    perfectDays: 2,
    activeDays: 3,
  });
});

test("windowTotals of an empty window has a null rate", () => {
  assert.equal(windowTotals(byDay([]), TODAY, 7).rate, null);
});

test("periodDelta compares with the window right before, in points", () => {
  const m = byDay([
    [0, 4, 3], // this week 75%
    [-1, 4, 3],
    [-7, 4, 1], // last week 25%
    [-8, 4, 1],
  ]);
  const d = periodDelta(m, TODAY, 7);
  assert.equal(d.current.rate, 0.75);
  assert.equal(d.previous.rate, 0.25);
  assert.equal(d.changePoints, 50);
});

test("periodDelta has no change when the earlier window is empty", () => {
  assert.equal(periodDelta(byDay([[0, 2, 2]]), TODAY, 7).changePoints, null);
});

test("dailyBars are oldest first and end on the given day", () => {
  const bars = dailyBars(byDay([[0, 2, 2], [-1, 2, 1]]), TODAY, 7);
  assert.equal(bars.length, 7);
  assert.equal(bars[6].key, TODAY);
  assert.equal(bars[0].key, at(-6));
  assert.equal(bars[6].perfect, true);
  assert.equal(bars[5].rate, 0.5);
  assert.equal(bars[5].perfect, false);
  assert.equal(bars[0].rate, null);
});

test("monthlyBars makes 12 calendar months ending with this one", () => {
  const bars = monthlyBars(
    byDay([
      [0, 2, 2], // Oct 12
      [-1, 2, 0], // Oct 11
      [-20, 2, 2], // Sep 22
      [3, 2, 2], // a future day: ignored
    ]),
    TODAY,
    12,
  );
  assert.equal(bars.length, 12);
  assert.equal(bars[11].key, "2026-10");
  assert.equal(bars[0].key, "2025-11");
  assert.equal(bars[11].rate, 0.5); // 2 of 4 in October
  assert.equal(bars[10].rate, 1); // September
  assert.equal(bars[10].perfect, true);
  assert.equal(bars[5].rate, null);
});

test("monthLabels names a month where it starts and leaves the rest blank", () => {
  const starts = ["2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07", "2026-10-05"];
  assert.deepEqual(monthLabels(starts, "en-US"), ["Aug", "", "", "Sep", "Oct"]);
});
