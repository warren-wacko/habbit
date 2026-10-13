import { addDays, weekOf } from "./dates";
import { heatLevel } from "./stats";
import type { DayTotals } from "./overall";

type Level = 0 | 1 | 2 | 3 | null;

/**
 * The six weeks the Heatmap layout draws: 42 cells, Monday first, the last week being the week
 * of the shared day. A cell is null when that day has not happened yet (after the shared day,
 * or after today) or there is no data.
 */
export function heatGridFor(
  date: string,
  today: string,
  byDay: ReadonlyMap<string, DayTotals> | undefined,
): Level[] {
  const start = addDays(weekOf(date)[0], -35);
  return Array.from({ length: 42 }, (_, i) => {
    const d = addDays(start, i);
    return d > date || d > today || !byDay ? null : heatLevel(byDay.get(d));
  });
}

/** The seven days ending on `date`, oldest first (the Week layout labels them with weekday letters) */
export function lastSevenDays(date: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(date, -(6 - i)));
}
