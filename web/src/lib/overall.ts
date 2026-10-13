import { addDays, isScheduled, toISO } from "./dates";
import type { HabitHistory } from "./types";

export type DayTotals = { scheduled: number; done: number };

/**
 * Per-day totals across all habits, plus the streak of "perfect" days
 * (every habit that was scheduled that day got done).
 * - A habit only counts from the day it was created.
 * - A day skipped for a habit (and not done anyway) is left out of that habit's count.
 * - A day with nothing scheduled neither extends nor breaks the streak.
 * - Today not being perfect yet doesn't break the streak: you still have until midnight.
 */
export function computeOverall(
  habits: HabitHistory[],
  today: string,
  from: string,
): { byDay: Map<string, DayTotals>; current: number; best: number } {
  const prepared = habits.map((h) => ({
    created: toISO(new Date(h.createdAt)),
    scheduleDays: h.scheduleDays,
    dates: new Set(h.dates),
    skips: new Set(h.skips ?? []),
  }));

  const byDay = new Map<string, DayTotals>();
  for (let d = from; d <= today; d = addDays(d, 1)) {
    let scheduled = 0;
    let done = 0;
    for (const h of prepared) {
      if (h.created > d || !isScheduled(d, h.scheduleDays)) continue;
      const isDone = h.dates.has(d);
      if (!isDone && h.skips.has(d)) continue;
      scheduled += 1;
      if (isDone) done += 1;
    }
    byDay.set(d, { scheduled, done });
  }

  const perfect = (d: string) => {
    const t = byDay.get(d);
    return !!t && t.scheduled > 0 && t.done === t.scheduled;
  };
  const hasWork = (d: string) => (byDay.get(d)?.scheduled ?? 0) > 0;

  let best = 0;
  let run = 0;
  for (let d = from; d <= today; d = addDays(d, 1)) {
    if (!hasWork(d)) continue;
    if (perfect(d)) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  let current = 0;
  let d = today;
  if (hasWork(d) && !perfect(d)) d = addDays(d, -1);
  for (; d >= from; d = addDays(d, -1)) {
    if (!hasWork(d)) continue;
    if (!perfect(d)) break;
    current += 1;
  }

  return { byDay, current, best };
}
