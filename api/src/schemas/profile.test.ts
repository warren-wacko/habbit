import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_NICKNAME, profileBody } from "./auth.js";

const ok = (v: unknown) => profileBody.safeParse(v).success;

test("a nickname is trimmed and kept", () => {
  const r = profileBody.parse({ nickname: "  Sam  " });
  assert.equal(r.nickname, "Sam");
});

test("a nickname may be empty or null to clear it", () => {
  assert.equal(ok({ nickname: "" }), true);
  assert.equal(ok({ nickname: null }), true);
});

test("a nickname of 30 characters is fine and 31 is not", () => {
  assert.equal(ok({ nickname: "x".repeat(MAX_NICKNAME) }), true);
  assert.equal(ok({ nickname: "x".repeat(MAX_NICKNAME + 1) }), false);
});

test("line breaks and other control characters are refused", () => {
  assert.equal(ok({ nickname: "Sam\nJones" }), false);
  assert.equal(ok({ nickname: "Sam\u0000" }), false);
  assert.equal(ok({ nickname: "Sam\u202Eevil" }), false); // a text-direction trick
});

test("ordinary names, accents, emoji and punctuation are fine", () => {
  assert.equal(ok({ nickname: "José" }), true);
  assert.equal(ok({ nickname: "Mr. O'Neil-Smith" }), true);
  assert.equal(ok({ nickname: "Sam 🌱" }), true);
});

test("markup is not rejected (it is stored as plain text and always shown as text)", () => {
  assert.equal(ok({ nickname: "<b>hi</b>" }), true);
});

test("the avatar icon and colour must be known values", () => {
  assert.equal(ok({ avatarIcon: "run", avatarColor: "aqua" }), true);
  assert.equal(ok({ avatarIcon: null }), true);
  assert.equal(ok({ avatarIcon: "skull" }), false);
  assert.equal(ok({ avatarColor: "teal" }), false);
  assert.equal(ok({ avatarColor: null }), false);
});

test("an empty edit is refused", () => {
  assert.equal(ok({}), false);
});

test("the accent must be one of the six colours", () => {
  assert.equal(ok({ accent: "violet" }), true);
  assert.equal(ok({ accent: "volt" }), true);
  assert.equal(ok({ accent: "teal" }), false);
  assert.equal(ok({ accent: null }), false);
  assert.equal(ok({ accent: "#ff0000" }), false);
});

test("the tour can only be marked as done, never undone", () => {
  assert.equal(ok({ onboarded: true }), true);
  assert.equal(ok({ onboarded: false }), false);
  assert.equal(ok({ onboarded: null }), false);
  assert.equal(ok({ onboarded: "yes" }), false);
});
