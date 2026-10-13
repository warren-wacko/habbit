import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_NOTE, newestFirst, noteFor } from "./notes";

const notes = [
  { date: "2026-10-03", text: "felt great" },
  { date: "2026-10-10", text: "short one" },
  { date: "2026-10-05", text: "tired" },
];

test("noteFor finds the note for a day and is empty otherwise", () => {
  assert.equal(noteFor(notes, "2026-10-05"), "tired");
  assert.equal(noteFor(notes, "2026-10-06"), "");
  assert.equal(noteFor(undefined, "2026-10-05"), "");
});

test("newestFirst sorts by date and leaves the input alone", () => {
  assert.deepEqual(newestFirst(notes).map((n) => n.date), ["2026-10-10", "2026-10-05", "2026-10-03"]);
  assert.equal(notes[0].date, "2026-10-03");
});

test("the note limit matches the API's", () => {
  assert.equal(MAX_NOTE, 280);
});
