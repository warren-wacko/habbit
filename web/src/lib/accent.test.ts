import { test } from "node:test";
import assert from "node:assert/strict";
import { accentAttribute, isAccent } from "./accent";
import { HABIT_COLORS } from "./types";

test("every habit colour is an accent and anything else is not", () => {
  for (const c of HABIT_COLORS) assert.equal(isAccent(c), true);
  assert.equal(isAccent("teal"), false);
  assert.equal(isAccent(""), false);
  assert.equal(isAccent(null), false);
  assert.equal(isAccent('"><script>'), false);
  assert.equal(isAccent(5), false);
});

test("volt is the default and sets no attribute, the others set their own name", () => {
  assert.equal(accentAttribute("volt"), null);
  assert.equal(accentAttribute("aqua"), "aqua");
  assert.equal(accentAttribute("sand"), "sand");
});
