// "YYYY-MM-DD" strings in, Date objects (UTC midnight) out
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

// Calendar-day arithmetic on "YYYY-MM-DD" strings. These never read the clock
// or the server's timezone, so the client's own "today" can be passed in.
export function shiftDay(day: string, deltaDays: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

// Day of the week for a calendar day, Monday = 0 ... Sunday = 6
export function weekdayIndex(day: string): number {
  return (new Date(`${day}T00:00:00.000Z`).getUTCDay() + 6) % 7;
}

// Is the habit scheduled on this calendar day? (scheduleDays: bit 0 = Monday ... bit 6 = Sunday)
export function isScheduledOn(day: string, scheduleDays: number): boolean {
  return ((scheduleDays >> weekdayIndex(day)) & 1) === 1;
}

// How many of the `days` days ending at `today` a habit is scheduled on.
// scheduleDays is a bitmask: bit 0 = Monday ... bit 6 = Sunday.
export function scheduledDaysInWindow(
  today: string,
  days: number,
  scheduleDays: number,
): number {
  let count = 0;
  for (let i = 0; i < days; i++) {
    if ((scheduleDays >> weekdayIndex(shiftDay(today, -i))) & 1) count += 1;
  }
  return count;
}

// A habit cannot be ticked, skipped or given an amount before the day it was created. The
// caller's own date can be a day behind UTC, so there is one day of slack.
export function isOnOrAfterHabitStart(day: string, createdAt: Date): boolean {
  return day >= shiftDay(createdAt.toISOString().slice(0, 10), -1);
}

// The caller's own "today" can differ from the server's by a timezone: allow one day either way
export function isNearToday(day: string, now: Date = new Date()): boolean {
  const today = now.toISOString().slice(0, 10);
  return day >= shiftDay(today, -1) && day <= shiftDay(today, 1);
}

// How far back a tick may be edited, in days
export const MAX_EDIT_DAYS_BACK = 365;

// A day a check-in can be recorded for: at most a year back, and not in the future.
// The caller's "today" can be a day ahead of UTC (UTC+1 to +14), so one extra day is allowed.
export function isTickableDay(day: string, now: Date = new Date()): boolean {
  const today = now.toISOString().slice(0, 10);
  return day >= shiftDay(today, -MAX_EDIT_DAYS_BACK) && day <= shiftDay(today, 1);
}

export function toDbDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}
