import { test } from "node:test";
import assert from "node:assert/strict";
import { afterProgress, amountCap, canCountAsDone, effectiveTarget, goalChange, isCounted } from "./counts";

const day = (over: Partial<Parameters<typeof afterProgress>[0]> = {}) => ({
  doneOnDate: false,
  target: 20,
  targetOnDate: 20,
  ...over,
});

test("reaching the target finishes the day", () => {
  assert.deepEqual(afterProgress(day(), 20), { done: true, amount: 20, target: 20 });
  assert.deepEqual(afterProgress(day(), 19), { done: false, amount: 19, target: 20 });
});

test("a finished Monday stays done after the target is raised to 30 on Wednesday", () => {
  const monday = day({ doneOnDate: true, target: 30, targetOnDate: 20 });
  assert.equal(effectiveTarget(monday), 20);
  assert.equal(afterProgress(monday, 25).done, true); // still judged by 20
  assert.equal(afterProgress(monday, 15).done, false); // only dropping below 20 un-does it
  // Wednesday is judged by the new target
  const wednesday = day({ target: 30, targetOnDate: 30 });
  assert.equal(afterProgress(wednesday, 25).done, false);
  assert.equal(afterProgress(wednesday, 30).done, true);
});

test("zero clears the day", () => {
  assert.deepEqual(afterProgress(day({ doneOnDate: true }), 0), { done: false, amount: null, target: 20 });
});

test("the daily amount is capped at ten times the target, never above 100,000", () => {
  assert.equal(amountCap(8), 80);
  assert.equal(amountCap(10_000), 100_000);
});

test("only habits with a target above 1 are counted", () => {
  assert.equal(isCounted({ target: 1, targetOnDate: 1 }), false);
  assert.equal(isCounted({ target: 8, targetOnDate: 8 }), true);
  // a day finished under a bigger target still shows as counted after the target is lowered
  assert.equal(isCounted({ target: 1, targetOnDate: 20 }), true);
});

test("a day counted as done at 10 of 30 follows the ordinary rule afterwards", () => {
  // the server stores that day's goal as 10, the habit's own target stays 30
  const day10 = { doneOnDate: true, target: 30, targetOnDate: 10 };
  assert.equal(afterProgress(day10, 11).done, true);
  assert.equal(afterProgress(day10, 30).done, true);
  assert.equal(afterProgress(day10, 8).done, false); // below what you counted
  // other days still need the full 30
  assert.equal(afterProgress({ doneOnDate: false, target: 30, targetOnDate: 30 }, 10).done, false);
});

test("Count as done is offered only with some progress, under the goal, not done, not skipped", () => {
  const base = { target: 30, targetOnDate: 30, doneOnDate: false, skippedOnDate: false, amountOnDate: 10 };
  assert.equal(canCountAsDone(base), true);
  assert.equal(canCountAsDone({ ...base, amountOnDate: null }), false); // nothing logged
  assert.equal(canCountAsDone({ ...base, amountOnDate: 0 }), false);
  assert.equal(canCountAsDone({ ...base, doneOnDate: true }), false);
  assert.equal(canCountAsDone({ ...base, skippedOnDate: true }), false);
  assert.equal(canCountAsDone({ ...base, target: 1, targetOnDate: 1 }), false); // a plain tick
});

test("goalChange tells a raise from a lowering", () => {
  assert.equal(goalChange(30, 40), "raise");
  assert.equal(goalChange(30, 10), "lower");
  assert.equal(goalChange(30, 30), "same");
});
