import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanNickname, displayName, initialOf } from "./profile";

test("the nickname is shown when there is one, otherwise the email", () => {
  assert.equal(displayName({ email: "sam@example.com", nickname: "Sam" }), "Sam");
  assert.equal(displayName({ email: "sam@example.com", nickname: null }), "sam@example.com");
  assert.equal(displayName({ email: "sam@example.com", nickname: "   " }), "sam@example.com");
});

test("the initial comes from the nickname, then the email, and keeps emoji whole", () => {
  assert.equal(initialOf({ email: "warren@example.com", nickname: "sam" }), "S");
  assert.equal(initialOf({ email: "warren@example.com", nickname: null }), "W");
  assert.equal(initialOf({ email: "x@example.com", nickname: "🌱 Sam" }), "🌱");
  assert.equal(initialOf({ email: "", nickname: null }), "Y");
});

test("a nickname is trimmed and an empty one becomes null so it clears", () => {
  assert.equal(cleanNickname("  Sam  "), "Sam");
  assert.equal(cleanNickname("   "), null);
  assert.equal(cleanNickname(""), null);
});
