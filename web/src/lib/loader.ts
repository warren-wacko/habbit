// The loading animation is the logo's 3 x 3 grid of squares. The eight outer squares fade in
// turn, clockwise, so a bright square seems to travel round the edge like a spinner. The
// middle one stays still. The logo itself is never rotated.

export const LOADER_CYCLE_MS = 1200;

/** The eight outer squares of the grid as [column, row], in clockwise order from the top left */
export const LOADER_RING: readonly (readonly [number, number])[] = [
  [0, 0], [1, 0], [2, 0], // across the top
  [2, 1], // down the right
  [2, 2], [1, 2], [0, 2], // back along the bottom
  [0, 1], // up the left
];

/** Each outer square starts its fade a little after the one before it */
export function loaderDelays(cycleMs: number = LOADER_CYCLE_MS): number[] {
  const gap = cycleMs / LOADER_RING.length;
  // negative, so the animation is already under way the moment it appears
  return LOADER_RING.map((_, i) => Math.round(-cycleMs + i * gap));
}
