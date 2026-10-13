import { test } from "node:test";
import assert from "node:assert/strict";
import { requestNewHabit, takeNewHabitRequest } from "./newHabitSignal";

test("a request waits until it is taken, and is taken only once", () => {
  assert.equal(takeNewHabitRequest(), false); // nothing asked yet
  requestNewHabit();
  assert.equal(takeNewHabitRequest(), true);
  assert.equal(takeNewHabitRequest(), false); // already used
});

test("asking twice still opens it only once", () => {
  requestNewHabit();
  requestNewHabit();
  assert.equal(takeNewHabitRequest(), true);
  assert.equal(takeNewHabitRequest(), false);
});
