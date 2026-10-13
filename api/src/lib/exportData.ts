// Turns a user's habits into a downloadable backup (JSON) or a spreadsheet (CSV).
// Pure functions: no database, no clock (the caller passes `now`).

export type ExportHabit = {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  scheduleDays: number;
  target?: number;
  unit?: string | null;
  sortOrder?: number;
  timeOfDay?: string;
  archivedAt: Date | null;
  createdAt: Date;
  logs: { date: Date }[];
  skips?: { date: Date }[];
  progress?: { date: Date; amount: number; target: number }[];
  notes?: { date: Date; text: string }[];
};

const day = (d: Date) => d.toISOString().slice(0, 10);

export type ExportProfile = {
  nickname: string | null;
  avatarIcon: string | null;
  avatarColor: string;
  accent: string;
};

export function buildExport(habits: ExportHabit[], now: Date, profile: ExportProfile | null = null) {
  return {
    app: "habbit",
    version: 1,
    exportedAt: now.toISOString(),
    profile,
    habits: habits.map((h) => ({
      id: h.id,
      name: h.name,
      color: h.color,
      icon: h.icon,
      scheduleDays: h.scheduleDays, // bitmask: bit 0 = Monday ... bit 6 = Sunday
      target: h.target ?? 1,
      unit: h.unit ?? null,
      timeOfDay: h.timeOfDay ?? "anytime",
      sortOrder: h.sortOrder ?? 0,
      archived: h.archivedAt !== null,
      archivedAt: h.archivedAt ? h.archivedAt.toISOString() : null,
      createdAt: h.createdAt.toISOString(),
      completedDates: h.logs.map((l) => day(l.date)).sort(),
      skippedDates: (h.skips ?? []).map((s) => day(s.date)).sort(),
      notes: (h.notes ?? [])
        .map((n) => ({ date: day(n.date), text: n.text }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      progress: (h.progress ?? [])
        .map((p) => ({ date: day(p.date), amount: p.amount, target: p.target }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    })),
  };
}

export type HabitExport = ReturnType<typeof buildExport>;

/**
 * One CSV cell. Quotes values that need it, and defuses spreadsheet formulas:
 * a cell starting with = + - @ (or a tab / carriage return) would otherwise be
 * run as a formula when the file is opened in Excel or Sheets.
 */
export function csvCell(value: string): string {
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  if (/[",\r\n]/.test(v)) v = `"${v.replace(/"/g, '""')}"`;
  return v;
}

// One row per completed day, oldest first. Habit definitions live in the JSON export.
export function toCsv(data: HabitExport): string {
  const rows: { date: string; name: string; archived: boolean }[] = [];
  for (const h of data.habits) {
    for (const date of h.completedDates) {
      rows.push({ date, name: h.name, archived: h.archived });
    }
  }
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));

  const lines = ["completed_on,habit,habit_archived"];
  for (const r of rows) {
    lines.push([r.date, csvCell(r.name), String(r.archived)].join(","));
  }
  return lines.join("\r\n") + "\r\n";
}
