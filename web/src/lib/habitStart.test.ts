import { test } from "node:test";
import assert from "node:assert/strict";
import { earliestStart, existedOn } from "./habitStart";

const TODAY = "2026-10-14";

test("a brand-new user with no habits can only see today", () => {
  assert.equal(earliestStart([], TODAY), TODAY);
});

test("a user whose only habit was made today can only see today", () => {
  assert.equal(earliestStart([TODAY], TODAY), TODAY);
});

test("the range reaches back to the oldest habit", () => {
  assert.equal(earliestStart(["2026-10-12", "2026-10-09", "2026-10-13"], TODAY), "2026-10-09");
});

test("a habit does not exist on days before it was created", () => {
  assert.equal(existedOn("2026-10-13", "2026-10-12"), false);
  assert.equal(existedOn("2026-10-13", "2026-10-13"), true);
  assert.equal(existedOn("2026-10-13", "2026-10-14"), true);
});

test("a habit whose creation day is not known yet is treated as existing", () => {
  assert.equal(existedOn(undefined, "2020-01-01"), true);
});
