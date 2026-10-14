import { test } from "node:test";
import assert from "node:assert/strict";
import { fitFontSize, placeSections, SHARE_LAYOUTS } from "./shareCard";

test("text that already fits keeps its size, and text that is too wide shrinks to fit", () => {
  assert.equal(fitFontSize(100, 300, 400), 100);
  assert.equal(fitFontSize(100, 400, 400), 100);
  assert.equal(fitFontSize(100, 800, 400), 50);
  assert.ok(fitFontSize(168, 700, 386) * (700 / 168) <= 386, "the result is never wider than the limit");
  assert.equal(fitFontSize(100, 0, 400), 100, "empty text is left alone");
  assert.equal(fitFontSize(100, 800, 0), 1, "never reaches zero or below");
});

test("sections are spread out and centred in the space they have", () => {
  // two 100px sections in 500px with a gap of at most 80: gap 80, block 280 tall, centred
  const [a, b] = placeSections(0, 500, [100, 100], 80);
  assert.equal(b - a, 180); // 100 tall + 80 gap
  assert.equal(a, 110); // (500 - 280) / 2
});

test("the gap never exceeds the maximum, so a short list is not stretched to the corners", () => {
  const ys = placeSections(0, 1000, [100, 100, 100], 40);
  assert.equal(ys[1] - ys[0] - 100, 40);
  assert.equal(ys[2] - ys[1] - 100, 40);
});

test("when the sections are tall they pack with no gap and start at the top", () => {
  const ys = placeSections(50, 350, [150, 150], 100);
  assert.deepEqual(ys, [50, 200]);
});

test("one section is centred", () => {
  assert.deepEqual(placeSections(0, 400, [100], 50), [150]);
});

test("every layout has a unique key and a label", () => {
  const keys = SHARE_LAYOUTS.map((l) => l.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(keys.length, 7);
  for (const l of SHARE_LAYOUTS) assert.ok(l.label.length > 0);
});
