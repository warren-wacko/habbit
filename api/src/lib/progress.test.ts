import { test } from "node:test";
import assert from "node:assert/strict";
import { amountCap, countAsDone, resolveProgress } from "./progress.js";

test("reaching the target finishes the day under that target", () => {
  assert.deepEqual(resolveProgress(20, 20, null), { kind: "set", done: true, storedTarget: 20 });
  assert.deepEqual(resolveProgress(19, 20, null), { kind: "set", done: false, storedTarget: 20 });
});

test("a finished day keeps its own target when the habit's target is raised", () => {
  // Monday: 20 pages reached under a target of 20. On Wednesday the target becomes 30.
  // Editing Monday to 25 keeps it done, judged by 20, not 30.
  assert.deepEqual(resolveProgress(25, 30, 20), { kind: "set", done: true, storedTarget: 20 });
  // dropping it below its own target un-does it, and it then follows the current target
  assert.deepEqual(resolveProgress(15, 30, 20), { kind: "set", done: false, storedTarget: 30 });
});

test("a day that is not done follows the current target", () => {
  assert.deepEqual(resolveProgress(25, 30, null), { kind: "set", done: false, storedTarget: 30 });
  assert.deepEqual(resolveProgress(25, 10, null), { kind: "set", done: true, storedTarget: 10 });
});

test("zero or less clears the day", () => {
  assert.deepEqual(resolveProgress(0, 20, 20), { kind: "clear" });
});

test("the daily amount is capped at ten times the target, never above 100,000", () => {
  assert.equal(amountCap(8), 80);
  assert.equal(amountCap(1), 10);
  assert.equal(amountCap(10_000), 100_000);
});

test("counting a day as done makes what was done that day's goal", () => {
  assert.equal(countAsDone(10, 30, false), 10);
});

test("a counted-as-done day then follows the ordinary rule", () => {
  // 10 of 30 counted as done -> stored target 10
  assert.deepEqual(resolveProgress(11, 30, 10), { kind: "set", done: true, storedTarget: 10 });
  assert.deepEqual(resolveProgress(30, 30, 10), { kind: "set", done: true, storedTarget: 10 });
  // taking your own credit away: below what you counted un-does it
  assert.deepEqual(resolveProgress(8, 30, 10), { kind: "set", done: false, storedTarget: 30 });
  assert.deepEqual(resolveProgress(0, 30, 10), { kind: "clear" });
});

test("only a day with some progress, under the goal and not done can be counted", () => {
  assert.equal(countAsDone(0, 30, false), null); // nothing done
  assert.equal(countAsDone(30, 30, false), null); // already reaches the goal
  assert.equal(countAsDone(10, 30, true), null); // already done
});
