// Today's date in the USER'S timezone, as "YYYY-MM-DD"
export function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// "YYYY-MM-DD" -> a Date at local midnight
export function parseLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(s: string, n: number): string {
  const d = parseLocal(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

// The Monday-to-Sunday week that contains the given date
export function weekOf(s: string): string[] {
  const dow = (parseLocal(s).getDay() + 6) % 7; // Monday = 0
  const monday = addDays(s, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function formatDate(s: string, opts: Intl.DateTimeFormatOptions): string {
  return parseLocal(s).toLocaleDateString(undefined, opts);
}

export const EVERY_DAY = 0b1111111; // bit 0 = Monday ... bit 6 = Sunday
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function isScheduled(day: string, scheduleDays: number): boolean {
  const dow = (parseLocal(day).getDay() + 6) % 7; // Monday = 0
  return ((scheduleDays >> dow) & 1) === 1;
}

// "" for every day, otherwise a short human label
export function scheduleLabel(scheduleDays: number): string {
  if (scheduleDays === EVERY_DAY) return "";
  if (scheduleDays === 0b0011111) return "Weekdays";
  if (scheduleDays === 0b1100000) return "Weekends";
  return DAY_NAMES.filter((_, i) => (scheduleDays >> i) & 1).join(" · ");
}
