import { test } from "node:test";
import assert from "node:assert/strict";
import { LOADER_CYCLE_MS, LOADER_RING, loaderDelays } from "./loader";

test("the ring is the eight outer squares of a 3 x 3 grid, never the middle one", () => {
  assert.equal(LOADER_RING.length, 8);
  assert.equal(new Set(LOADER_RING.map(([c, r]) => `${c},${r}`)).size, 8);
  assert.ok(!LOADER_RING.some(([c, r]) => c === 1 && r === 1), "the centre stays still");
  for (const [c, r] of LOADER_RING) assert.ok(c >= 0 && c <= 2 && r >= 0 && r <= 2);
});

test("each square sits next to the previous one, so the light travels round the edge", () => {
  for (let i = 0; i < LOADER_RING.length; i++) {
    const [c1, r1] = LOADER_RING[i];
    const [c2, r2] = LOADER_RING[(i + 1) % LOADER_RING.length];
    const distance = Math.abs(c1 - c2) + Math.abs(r1 - r2);
    assert.equal(distance, 1, `square ${i} to ${(i + 1) % 8} is not a neighbour`);
  }
});

test("the delays step evenly through one cycle and start the animation already running", () => {
  const delays = loaderDelays();
  assert.equal(delays.length, 8);
  assert.ok(delays.every((d) => d < 0 && d >= -LOADER_CYCLE_MS), "all delays are negative and within a cycle");
  for (let i = 1; i < delays.length; i++) assert.ok(delays[i] > delays[i - 1], "each square starts after the last");
  assert.equal(delays[1] - delays[0], LOADER_CYCLE_MS / 8);
});
