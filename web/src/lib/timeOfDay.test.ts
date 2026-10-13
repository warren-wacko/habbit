import { test } from "node:test";
import assert from "node:assert/strict";
import { groupByTimeOfDay, moveToGroup, moveWithinGroup, showHeadings, type TimeOfDay } from "./timeOfDay";

const h = (id: number, timeOfDay: TimeOfDay) => ({ id, timeOfDay });

test("groups come out morning, afternoon, evening, anytime and keep their order", () => {
  const groups = groupByTimeOfDay([h(1, "anytime"), h(2, "evening"), h(3, "morning"), h(4, "morning")]);
  assert.deepEqual(groups.map((g) => g.key), ["morning", "evening", "anytime"]);
  assert.deepEqual(groups[0].habits.map((x) => x.id), [3, 4]);
  assert.deepEqual(groups.map((g) => g.label), ["Morning", "Evening", "Anytime"]);
});

test("headings only show once something has a time of day", () => {
  assert.equal(showHeadings(groupByTimeOfDay([h(1, "anytime"), h(2, "anytime")])), false);
  assert.equal(showHeadings(groupByTimeOfDay([h(1, "anytime"), h(2, "morning")])), true);
});

test("moving swaps with the nearest habit in the same group", () => {
  const list = [h(1, "morning"), h(2, "evening"), h(3, "morning"), h(4, "evening")];
  // 3 moves up past the evening habit 2 and swaps with morning habit 1
  assert.deepEqual(moveWithinGroup(list, 3, "up"), [3, 2, 1, 4]);
  assert.deepEqual(moveWithinGroup(list, 1, "down"), [3, 2, 1, 4]);
  assert.deepEqual(moveWithinGroup(list, 2, "down"), [1, 4, 3, 2]);
});

test("the first and last of a group cannot move further", () => {
  const list = [h(1, "morning"), h(2, "evening"), h(3, "morning")];
  assert.equal(moveWithinGroup(list, 1, "up"), null);
  assert.equal(moveWithinGroup(list, 3, "down"), null);
  assert.equal(moveWithinGroup(list, 2, "up"), null); // alone in its group
  assert.equal(moveWithinGroup(list, 99, "up"), null);
});

test("moving does not change the input", () => {
  const list = [h(1, "anytime"), h(2, "anytime")];
  moveWithinGroup(list, 2, "up");
  assert.deepEqual(list.map((x) => x.id), [1, 2]);
});

test("joining another group lands at the end of that group", () => {
  const list = [h(1, "morning"), h(2, "anytime"), h(3, "morning"), h(4, "anytime")];
  // habit 4 (anytime) goes to morning: after the last morning habit (3)
  assert.deepEqual(moveToGroup(list, 4, "morning"), [1, 2, 3, 4]);
  // habit 2 goes to morning: after 3
  assert.deepEqual(moveToGroup(list, 2, "morning"), [1, 3, 2, 4]);
});

test("joining an empty group puts the habit at the very end", () => {
  const list = [h(1, "morning"), h(2, "morning"), h(3, "anytime")];
  assert.deepEqual(moveToGroup(list, 1, "evening"), [2, 3, 1]);
});

test("moving to the group it is already in keeps it last in that group", () => {
  const list = [h(1, "morning"), h(2, "morning"), h(3, "anytime")];
  assert.deepEqual(moveToGroup(list, 1, "morning"), [2, 1, 3]);
});
