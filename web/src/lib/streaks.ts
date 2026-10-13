import { addDays, EVERY_DAY, isScheduled } from "./dates";

const NO_SKIPS: ReadonlySet<string> = new Set();

/**
 * Current and best streak, counted in scheduled days only.
 * - A day the habit isn't scheduled neither extends nor breaks a streak.
 * - A day the user skipped (and didn't do anyway) is treated like a rest day.
 * - Today not being done yet doesn't break the current streak: you still have
 *   until midnight.
 * Limited to the window of `from..today` that was fetched.
 */
export function computeStreaks(
  dates: ReadonlySet<string>,
  today: string,
  from: string,
  scheduleDays: number = EVERY_DAY,
  skips: ReadonlySet<string> = NO_SKIPS,
): { current: number; best: number } {
  const counts = (d: string) => isScheduled(d, scheduleDays) && !(skips.has(d) && !dates.has(d));
  let best = 0;
  let run = 0;
  for (let d = from; d <= today; d = addDays(d, 1)) {
    if (!counts(d)) continue;
    if (dates.has(d)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  let current = 0;
  let d = today;
  if (counts(d) && !dates.has(d)) d = addDays(d, -1);
  for (; d >= from; d = addDays(d, -1)) {
    if (!counts(d)) continue;
    if (!dates.has(d)) break;
    current += 1;
  }

  return { current, best };
}
