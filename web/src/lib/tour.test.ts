import { test } from "node:test";
import assert from "node:assert/strict";
import { clampStep, TOUR_SLIDES } from "./tour";

test("the tour stays short: at most eight screens", () => {
  assert.ok(TOUR_SLIDES.length >= 3 && TOUR_SLIDES.length <= 8);
});

test("each screen is a headline, one sentence and at most three short tips", () => {
  for (const s of TOUR_SLIDES) {
    assert.ok(s.title.length > 0 && s.title.length <= 40, `title too long: ${s.title}`);
    assert.ok(s.body.length > 0 && s.body.length <= 130, `body too long: ${s.id}`);
    assert.ok(s.tips.length >= 1 && s.tips.length <= 3, `tips count: ${s.id}`);
    for (const t of s.tips) assert.ok(t.length <= 110, `tip too long: ${t}`);
  }
});

test("the screens have distinct ids and titles", () => {
  assert.equal(new Set(TOUR_SLIDES.map((s) => s.id)).size, TOUR_SLIDES.length);
  assert.equal(new Set(TOUR_SLIDES.map((s) => s.title)).size, TOUR_SLIDES.length);
});

test("the main features are all mentioned somewhere in the tour", () => {
  const text = TOUR_SLIDES.flatMap((s) => [s.title, s.body, ...s.tips]).join(" ").toLowerCase();
  for (const word of [
    "streak", "perfect day", "share", "goal", "morning", "quick start", "edit", "skip",
    "count a short day as done", "note", "archive", "undo", "progress", "reorder",
    "nickname", "colour theme", "download",
  ]) {
    assert.ok(text.includes(word), `the tour never mentions "${word}"`);
  }
});

test("each pretend card is used by exactly one screen", () => {
  const kinds = TOUR_SLIDES.flatMap((s) => (s.sample ? [s.sample] : []));
  assert.deepEqual([...kinds].sort(), ["goal", "page", "share"]);
});

test("clampStep keeps the step within the screens", () => {
  assert.equal(clampStep(-1, 6), 0);
  assert.equal(clampStep(0, 6), 0);
  assert.equal(clampStep(3, 6), 3);
  assert.equal(clampStep(6, 6), 5);
});
