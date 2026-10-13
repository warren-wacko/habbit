// The month grid for the "Pick a day" sheet.

import { toISO } from "./dates";

export type PickerCell = { day: number; date: string; disabled: boolean; today: boolean };

/**
 * One month, Monday first: how many blank cells come before the 1st, then every day.
 * A day is disabled when it is after today or before `min` (the oldest day that can be edited).
 */
export function pickerMonth(
  year: number,
  month: number, // 1-12
  today: string,
  min: string,
): { leading: number; cells: PickerCell[] } {
  const leading = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const total = new Date(year, month, 0).getDate();
  const cells: PickerCell[] = [];
  for (let day = 1; day <= total; day++) {
    const date = toISO(new Date(year, month - 1, day));
    cells.push({ day, date, disabled: date > today || date < min, today: date === today });
  }
  return { leading, cells };
}

const monthIndex = (year: number, month: number) => year * 12 + month - 1;
const dayMonthIndex = (day: string) => monthIndex(Number(day.slice(0, 4)), Number(day.slice(5, 7)));

/** Whether a month has any pickable day: it must fall between the month of `min` and today's */
export function monthInRange(year: number, month: number, today: string, min: string): boolean {
  const i = monthIndex(year, month);
  return i >= dayMonthIndex(min) && i <= dayMonthIndex(today);
}

/** The month before or after (delta -1 or +1), rolling over the year */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const i = monthIndex(year, month) + delta;
  return { year: Math.floor(i / 12), month: (i % 12) + 1 };
}
