// Numbers for the Progress screen. Everything works from the per-day totals that
// computeOverall() builds: how many habits were scheduled and how many were done.

import { addDays, parseLocal, toISO } from "./dates";

export type DayTotals = { scheduled: number; done: number };
export type ByDay = ReadonlyMap<string, DayTotals>;

const isActive = (t: DayTotals | undefined): t is DayTotals => !!t && t.scheduled > 0;
const isPerfect = (t: DayTotals | undefined) => isActive(t) && t.done === t.scheduled;

/** 0..1, or null when nothing was scheduled that day */
export function dayRate(t: DayTotals | undefined): number | null {
  return isActive(t) ? t.done / t.scheduled : null;
}

/** Heatmap shade: 0 = nothing done, 1 = under half, 2 = over half, 3 = everything */
export function heatLevel(t: DayTotals | undefined): 0 | 1 | 2 | 3 {
  const r = dayRate(t);
  if (r === null || r === 0) return 0;
  if (r < 0.5) return 1;
  if (r < 1) return 2;
  return 3;
}

export type WindowTotals = {
  scheduled: number;
  done: number;
  rate: number | null;
  perfectDays: number;
  activeDays: number;
};

/** Totals for the `days` days ending on `endDay` (inclusive) */
export function windowTotals(byDay: ByDay, endDay: string, days: number): WindowTotals {
  let scheduled = 0;
  let done = 0;
  let perfectDays = 0;
  let activeDays = 0;
  for (let i = 0; i < days; i++) {
    const t = byDay.get(addDays(endDay, -i));
    if (!isActive(t)) continue;
    scheduled += t.scheduled;
    done += t.done;
    activeDays += 1;
    if (isPerfect(t)) perfectDays += 1;
  }
  return { scheduled, done, rate: scheduled ? done / scheduled : null, perfectDays, activeDays };
}

/** This window against the one right before it, in percentage points */
export function periodDelta(byDay: ByDay, endDay: string, days: number) {
  const current = windowTotals(byDay, endDay, days);
  const previous = windowTotals(byDay, addDays(endDay, -days), days);
  const changePoints =
    current.rate !== null && previous.rate !== null
      ? Math.round((current.rate - previous.rate) * 100)
      : null;
  return { current, previous, changePoints };
}

export type Bar = { key: string; label: string; rate: number | null; perfect: boolean };

/** One bar per day, oldest first, for the `days` days ending on `endDay` */
export function dailyBars(byDay: ByDay, endDay: string, days: number): Bar[] {
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(endDay, -(days - 1 - i));
    const t = byDay.get(day);
    return { key: day, label: day, rate: dayRate(t), perfect: isPerfect(t) };
  });
}

/** One bar per calendar month, oldest first, ending with the month of `today` */
export function monthlyBars(byDay: ByDay, today: string, months = 12): Bar[] {
  const end = parseLocal(today);
  const buckets: { key: string; scheduled: number; done: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
    buckets.push({ key: toISO(d).slice(0, 7), scheduled: 0, done: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  for (const [day, t] of byDay) {
    const i = index.get(day.slice(0, 7));
    if (i === undefined || day > today || !isActive(t)) continue;
    buckets[i].scheduled += t.scheduled;
    buckets[i].done += t.done;
  }
  return buckets.map((b) => ({
    key: b.key,
    label: b.key,
    rate: b.scheduled ? b.done / b.scheduled : null,
    perfect: b.scheduled > 0 && b.done === b.scheduled,
  }));
}

/** For the 12 heatmap week-columns (oldest first): the month name where a month begins, else "" */
export function monthLabels(weekStarts: string[], locale?: string): string[] {
  let last = "";
  return weekStarts.map((monday) => {
    const key = monday.slice(0, 7);
    if (key === last) return "";
    last = key;
    return parseLocal(monday).toLocaleDateString(locale, { month: "short" });
  });
}
