import { test } from "node:test";
import assert from "node:assert/strict";
import { greetingFor, greetingLine } from "./greeting";

test("the greeting follows the hour, with the edges in the right place", () => {
  assert.equal(greetingFor(5), "Good morning");
  assert.equal(greetingFor(11), "Good morning");
  assert.equal(greetingFor(12), "Good afternoon");
  assert.equal(greetingFor(16), "Good afternoon");
  assert.equal(greetingFor(17), "Good evening");
  assert.equal(greetingFor(21), "Good evening");
});

test("the small hours get a plain hello", () => {
  assert.equal(greetingFor(22), "Hi");
  assert.equal(greetingFor(0), "Hi");
  assert.equal(greetingFor(4), "Hi");
});

test("every hour of the day has a greeting", () => {
  for (let h = 0; h < 24; h++) assert.ok(greetingFor(h).length > 0);
});

test("the nickname is added when there is one", () => {
  assert.equal(greetingLine(9, "Sam"), "Good morning, Sam");
  assert.equal(greetingLine(9, "  Sam  "), "Good morning, Sam");
});

test("without a nickname there is no name, and never the email", () => {
  assert.equal(greetingLine(9, null), "Good morning");
  assert.equal(greetingLine(9, undefined), "Good morning");
  assert.equal(greetingLine(9, "   "), "Good morning");
});
