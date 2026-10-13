import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MESSAGE, isMessageKey, messageFor, PERFECT_MESSAGES } from "./shareMessage";

test("the four new messages and Perfect day are all offered", () => {
  assert.deepEqual(
    PERFECT_MESSAGES.map((m) => m.label),
    ["Locked in.", "Untouchable.", "Built different.", "Zero days off.", "Perfect day."],
  );
});

test("each message is one or two short lines, so it stays big on the poster", () => {
  for (const m of PERFECT_MESSAGES) {
    assert.ok(m.lines.length >= 1 && m.lines.length <= 2, m.key);
    for (const line of m.lines) assert.ok(line.length > 0 && line.length <= 12, `${m.key}: ${line}`);
  }
});

test("keys are unique and the default is one of them", () => {
  const keys = PERFECT_MESSAGES.map((m) => m.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(isMessageKey(DEFAULT_MESSAGE));
  assert.equal(DEFAULT_MESSAGE, "locked");
});

test("only real keys are accepted, so a stored value cannot inject anything", () => {
  assert.equal(isMessageKey("zero"), true);
  assert.equal(isMessageKey("<script>"), false);
  assert.equal(isMessageKey(""), false);
  assert.equal(isMessageKey(null), false);
  assert.equal(isMessageKey(3), false);
});

test("messageFor falls back to the first message for an unknown key", () => {
  assert.equal(messageFor("different").lines.join(" "), "Built different.");
  assert.equal(messageFor("nope" as never).key, "locked");
});
