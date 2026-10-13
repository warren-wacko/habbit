import type { TimeOfDay } from "./timeOfDay";

export type User = { id: number; email: string; password: string };
export type AuthResponse = { user: User; token: string };

export const HABIT_COLORS = ["volt", "aqua", "sky", "violet", "rose", "sand"] as const;
export type HabitColor = (typeof HABIT_COLORS)[number];

// The icon is stored as a key; components.habitIcons maps it to a Lucide icon
export const HABIT_ICON_KEYS = [
  "run",
  "water",
  "read",
  "meditate",
  "strength",
  "food",
  "sleep",
  "journal",
  "music",
  "tidy",
  "teeth",
  "meds",
  "stretch",
  "focus",
  "create",
  "grow",
  "coffee",
  "morning",
] as const;
export type HabitIconKey = (typeof HABIT_ICON_KEYS)[number];

export type HabitStyle = {
  color: HabitColor;
  icon: HabitIconKey | null;
  scheduleDays: number; // bitmask: bit 0 = Monday ... bit 6 = Sunday
};

// A daily goal: target 1 is a plain tick, more is a count ("8" glasses)
export type HabitCount = {
  target: number;
  unit: string | null;
};

// When in the day a habit belongs; Today groups by it
export type HabitWhen = { timeOfDay: TimeOfDay };

export type Habit = HabitStyle &
  HabitCount &
  HabitWhen & {
    id: number;
    name: string;
    doneOnDate: boolean;
    skippedOnDate: boolean;
    amountOnDate: number | null; // how much was logged that day; null for a plain tick
    note: string | null; // the note written on that day, if any
    targetOnDate: number; // the target that judges that day (a finished day keeps its own)
  };

export type ToggleResponse = { id: number; date: string; done: boolean };
export type ProgressResponse = { id: number; date: string; amount: number; target: number; done: boolean };
export type SkipResponse = { id: number; date: string; skipped: boolean };

export type HabitHistory = HabitStyle &
  HabitCount &
  HabitWhen & {
  id: number;
  name: string;
  createdAt: string;
  dates: string[]; // "YYYY-MM-DD" days this habit was completed
  skips?: string[]; // days the user skipped: they neither count for nor against the habit
  };
export type HistoryResponse = { from: string; to: string; habits: HabitHistory[] };

// What the API may still return for rows saved before the redesign: an emoji
// icon and the old colour names. lib/legacy.ts turns these into the types above.
export type RawStyle = { color: string; icon: string | null; scheduleDays: number };
