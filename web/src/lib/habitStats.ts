// Numbers and calendar for a single habit's detail page.

import { addDays, isScheduled, parseLocal, toISO } from "./dates";
import { computeStreaks } from "./streaks";

export type HabitInput = {
  scheduleDays: number; // bitmask: bit 0 = Monday ... bit 6 = Sunday
  created: string; // "YYYY-MM-DD", the first day it counts
  dates: ReadonlySet<string>; // days it was completed
  skips?: ReadonlySet<string>; // days skipped on purpose
};

const skipped = (h: HabitInput, d: string) => !!h.skips?.has(d) && !h.dates.has(d);
const counts = (h: HabitInput, d: string) =>
  d >= h.created && isScheduled(d, h.scheduleDays) && !skipped(h, d);

export type HabitDetailStats = {
  current: number;
  best: number;
  rate30: number | null;
  checkIns: number;
  done30: number;
  missed30: number;
};

/**
 * - rate30: done over scheduled in the last 30 days (today included)
 * - missed30: scheduled days in those 30 that were not done (today is still open, so it never counts)
 * - done30: scheduled days in those 30 that were done
 */
export function habitDetailStats(h: HabitInput, today: string, from: string): HabitDetailStats {
  const { current, best } = computeStreaks(h.dates, today, from, h.scheduleDays, h.skips);

  let scheduled30 = 0;
  let done30 = 0;
  let missed30 = 0;
  for (let i = 0; i < 30; i++) {
    const d = addDays(today, -i);
    if (!counts(h, d)) continue;
    scheduled30 += 1;
    if (h.dates.has(d)) done30 += 1;
    else if (d !== today) missed30 += 1;
  }

  const checkIns = [...h.dates].filter((d) => d >= from && d <= today).length;

  return {
    current,
    best,
    rate30: scheduled30 ? done30 / scheduled30 : null,
    checkIns,
    done30,
    missed30,
  };
}

export type CalState = "hit" | "miss" | "skip" | "off" | "future" | "before" | "pending";
export type CalCell = { day: number; date: string; state: CalState; today: boolean };

/** One month for the calendar: blank cells before the 1st (Monday first), then every day */
export function monthGrid(
  year: number,
  month: number, // 1-12
  h: HabitInput,
  today: string,
): { leading: number; cells: CalCell[] } {
  const first = new Date(year, month - 1, 1);
  const leading = (first.getDay() + 6) % 7;
  const total = new Date(year, month, 0).getDate();
  const cells: CalCell[] = [];
  for (let day = 1; day <= total; day++) {
    const date = toISO(new Date(year, month - 1, day));
    const done = h.dates.has(date);
    let state: CalState;
    if (date > today) state = "future";
    else if (done) state = "hit"; // done counts even on a rest day
    else if (date < h.created) state = "before";
    else if (skipped(h, date) && isScheduled(date, h.scheduleDays)) state = "skip";
    else if (!isScheduled(date, h.scheduleDays)) state = "off";
    else if (date === today) state = "pending";
    else state = "miss";
    cells.push({ day, date, state, today: date === today });
  }
  return { leading, cells };
}

export function monthTitle(year: number, month: number, locale?: string): string {
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

export type StreakRun = { start: string; end: string; length: number; ongoing: boolean };

/**
 * Every run of consecutive scheduled days that were done, newest first.
 * Rest days neither extend nor break a run, and today not being done yet does
 * not end one. A run still open at the end is the ongoing streak.
 */
export function streakRuns(h: HabitInput, today: string, from: string): StreakRun[] {
  const runs: StreakRun[] = [];
  let open = null as { start: string; end: string; length: number } | null;
  for (let d = from < h.created ? h.created : from; d <= today; d = addDays(d, 1)) {
    if (!isScheduled(d, h.scheduleDays) || skipped(h, d)) continue;
    if (h.dates.has(d)) {
      open = open
        ? { ...open, end: d, length: open.length + 1 }
        : { start: d, end: d, length: 1 };
    } else if (d !== today && open) {
      runs.push({ ...open, ongoing: false });
      open = null;
    }
  }
  if (open) runs.push({ ...open, ongoing: true });
  return runs.reverse();
}

// "Aug 3" style label for a "YYYY-MM-DD" day
export function shortDate(day: string, locale?: string): string {
  return parseLocal(day).toLocaleDateString(locale, { month: "short", day: "numeric" });
}
