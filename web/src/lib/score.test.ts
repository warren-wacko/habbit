import { test } from "node:test";
import assert from "node:assert/strict";
import { SCORE_CHAR_EM, SCORE_MAX_PX, SCORE_MAX_WIDTH_PX, SCORE_MIN_PX, scoreFontPx } from "./score";

test("short scores keep the full size", () => {
  assert.ok(scoreFontPx("0/0") >= 30, "0/0 stays big");
  assert.ok(scoreFontPx("3/3") >= 30, "3/3 stays big");
  assert.ok(scoreFontPx("8/8") >= 30, "8/8 stays big");
});

test("longer scores get smaller, never bigger", () => {
  const sizes = ["3/3", "9/10", "10/10", "12/12", "100/100"].map(scoreFontPx);
  for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] <= sizes[i - 1], `size grew at ${i}`);
  assert.ok(scoreFontPx("10/10") < scoreFontPx("9/10") + 1);
  assert.ok(scoreFontPx("10/10") < scoreFontPx("3/3"));
});

test("any score up to 100/100 fits inside the ring, as long as the floor is not hit", () => {
  for (const label of ["0/0", "1/1", "9/9", "9/10", "10/10", "10/12", "99/99", "100/100"]) {
    const px = scoreFontPx(label);
    if (px > SCORE_MIN_PX) assert.ok(px * SCORE_CHAR_EM * label.length <= SCORE_MAX_WIDTH_PX, `${label} is too wide`);
  }
});

test("the size stays within its limits, even for odd input", () => {
  for (const label of ["", "1", "1".repeat(40)]) {
    const px = scoreFontPx(label);
    assert.ok(px >= SCORE_MIN_PX && px <= SCORE_MAX_PX, `${label.length} chars gave ${px}`);
  }
});
