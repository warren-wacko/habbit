// The score ("3/5") is drawn inside the progress ring on the Today screen. The ring's inside is
// only about 91px across, so a longer score such as 10/10 must be drawn smaller or it runs
// over the ring.

/** The widest the score may be: a little less than the ring's inside, so it has some air */
export const SCORE_MAX_WIDTH_PX = 80;
/** The biggest size: what a short score such as 3/3 uses */
export const SCORE_MAX_PX = 32;
/** Never smaller than this, even for a very long score */
export const SCORE_MIN_PX = 12;
/**
 * How wide one character of the display font is, as a share of its size. Measured in the
 * browser: "3/3" is 0.62 per character and "10/10" is 0.69, so 0.7 leaves a little spare.
 */
export const SCORE_CHAR_EM = 0.7;

/** The font size, in px, that keeps this score inside the ring */
export function scoreFontPx(label: string): number {
  const fit = Math.floor(SCORE_MAX_WIDTH_PX / (Math.max(1, label.length) * SCORE_CHAR_EM));
  return Math.min(SCORE_MAX_PX, Math.max(SCORE_MIN_PX, fit));
}
