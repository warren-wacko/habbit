// Plain-language insights from a user's history. Pure functions: the caller
// passes `today`, so results match the user's own calendar.

import { shiftDay, weekdayIndex } from "./dates.js";

export type InsightHabit = {
  id: number;
  name: string;
  icon: string | null;
  scheduleDays: number; // bitmask: bit 0 = Monday ... bit 6 = Sunday
  created: string; // "YYYY-MM-DD"; a habit only counts from this day
  dates: ReadonlySet<string>; // days it was completed
  skips?: ReadonlySet<string>; // days the user skipped: they count neither for nor against it
};

type Tally = { scheduled: number; done: number };

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Below these sample sizes a "best" or "worst" would be noise, so we say nothing
const MIN_WEEKDAY_SAMPLES = 4;
const MIN_HABIT_SAMPLES = 7;
const TREND_DAYS = 30;

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const rate = (t: Tally) => (t.scheduled === 0 ? null : round3(t.done / t.scheduled));
const add = (t: Tally, done: boolean) => {
  t.scheduled += 1;
  if (done) t.done += 1;
};

// Highest and lowest by rate. Ties go to the earliest entry. When everything
// is equal there is no meaningful best or worst, so both come back null.
function extremes<T extends { rate: number | null }>(items: T[]) {
  const rated = items.filter((i): i is T & { rate: number } => i.rate !== null);
  if (rated.length === 0) return { best: null, worst: null };
  let best = rated[0];
  let worst = rated[0];
  for (const item of rated) {
    if (item.rate > best.rate) best = item;
    if (item.rate < worst.rate) worst = item;
  }
  if (best.rate === worst.rate) return { best: null, worst: null };
  return { best, worst };
}

export function computeInsights(habits: InsightHabit[], today: string, days: number) {
  const total: Tally = { scheduled: 0, done: 0 };
  const current: Tally = { scheduled: 0, done: 0 }; // last 30 days
  const previous: Tally = { scheduled: 0, done: 0 }; // the 30 days before that
  const byWeekday: Tally[] = WEEKDAYS.map(() => ({ scheduled: 0, done: 0 }));
  const byHabit = new Map<number, Tally>(habits.map((h) => [h.id, { scheduled: 0, done: 0 }]));

  for (let i = 0; i < days; i++) {
    const d = shiftDay(today, -i);
    const dow = weekdayIndex(d);
    for (const h of habits) {
      if (h.created > d || !((h.scheduleDays >> dow) & 1)) continue;
      const done = h.dates.has(d);
      if (!done && h.skips?.has(d)) continue;
      add(total, done);
      add(byWeekday[dow], done);
      add(byHabit.get(h.id)!, done);
      if (i < TREND_DAYS) add(current, done);
      else if (i < TREND_DAYS * 2) add(previous, done);
    }
  }

  const weekdays = byWeekday.map((t, i) => ({
    weekday: i,
    name: WEEKDAYS[i],
    scheduled: t.scheduled,
    done: t.done,
    rate: rate(t),
  }));
  const weekdayCandidates = weekdays.filter((w) => w.scheduled >= MIN_WEEKDAY_SAMPLES);
  const dayExtremes = extremes(weekdayCandidates);

  const habitStats = habits.map((h) => {
    const t = byHabit.get(h.id)!;
    return { id: h.id, name: h.name, icon: h.icon, scheduled: t.scheduled, done: t.done, rate: rate(t) };
  });
  const habitExtremes = extremes(habitStats.filter((h) => h.scheduled >= MIN_HABIT_SAMPLES));

  const currentRate = rate(current);
  const previousRate = rate(previous);

  return {
    windowDays: days,
    today,
    totals: { scheduled: total.scheduled, done: total.done, rate: rate(total) },
    weekdays,
    bestWeekday: dayExtremes.best,
    worstWeekday: dayExtremes.worst,
    trend: {
      windowDays: TREND_DAYS,
      current: { ...current, rate: currentRate },
      previous: { ...previous, rate: previousRate },
      // percentage points, e.g. 12.5 means "12.5 points higher than the 30 days before"
      changePoints:
        currentRate !== null && previousRate !== null
          ? Math.round((currentRate - previousRate) * 1000) / 10
          : null,
    },
    habits: habitStats,
    strongestHabit: habitExtremes.best,
    weakestHabit: habitExtremes.worst,
  };
}
