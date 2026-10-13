import { test } from "node:test";
import assert from "node:assert/strict";
import { checkOrder, checkTimes, nextSortOrder } from "./order.js";

const owned = new Set([1, 2, 3, 4]);

test("a list of the user's own habits is accepted, in any order and any subset", () => {
  assert.deepEqual(checkOrder([3, 1, 2, 4], owned), { ok: true });
  assert.deepEqual(checkOrder([2, 1], owned), { ok: true });
});

test("an id that is not the user's is refused, so other people's habits are never touched", () => {
  assert.deepEqual(checkOrder([1, 99], owned), { ok: false, reason: "Habit not found" });
});

test("duplicates, an empty list and a huge list are refused", () => {
  assert.equal(checkOrder([1, 1], owned).ok, false);
  assert.equal(checkOrder([], owned).ok, false);
  const many = Array.from({ length: 201 }, (_, i) => i + 1);
  assert.equal(checkOrder(many, new Set(many)).ok, false);
});

test("a new habit lands last", () => {
  assert.equal(nextSortOrder(null), 0); // the first habit
  assert.equal(nextSortOrder(0), 1); // existing habits all sit at 0
  assert.equal(nextSortOrder(5), 6);
});

test("time-of-day changes are only allowed for habits that are in the order list", () => {
  assert.deepEqual(checkTimes({ "2": "morning" }, [1, 2, 3]), { ok: true });
  assert.deepEqual(checkTimes({}, [1]), { ok: true });
  assert.equal(checkTimes({ "9": "morning" }, [1, 2, 3]).ok, false); // not in the list
  assert.equal(checkTimes({ x: "morning" }, [1, 2, 3]).ok, false); // not a number
  assert.equal(checkTimes({ "1.5": "morning" }, [1, 2, 3]).ok, false); // not a whole number
});
