import {
  HABIT_COLORS,
  HABIT_ICON_KEYS,
  type Habit,
  type HabitColor,
  type HabitHistory,
  type HabitIconKey,
} from "./types";

// Habits saved before the redesign have an emoji icon and the old colour names.
// These maps let them show correctly without touching the data.

const EMOJI_TO_ICON: Record<string, HabitIconKey> = {
  "🏃": "run",
  "💧": "water",
  "📚": "read",
  "🧘": "meditate",
  "💪": "strength",
  "🥗": "food",
  "😴": "sleep",
  "✍️": "journal",
  "✍": "journal",
  "🎸": "music",
  "🧹": "tidy",
  "🦷": "teeth",
  "💊": "meds",
  "🚶": "stretch",
  "🧠": "focus",
  "🎨": "create",
  "🌱": "grow",
  "☕": "coffee",
  "🌞": "morning",
};

const OLD_COLOR_TO_NEW: Record<string, HabitColor> = {
  yellow: "volt",
  coral: "rose", // no coral in the new palette; rose is the nearest
  mint: "aqua",
  sky: "sky",
  violet: "violet",
  pink: "rose",
};

export function normalizeIcon(raw: string | null | undefined): HabitIconKey | null {
  if (!raw) return null;
  if ((HABIT_ICON_KEYS as readonly string[]).includes(raw)) return raw as HabitIconKey;
  return EMOJI_TO_ICON[raw] ?? null;
}

export function normalizeColor(raw: string | null | undefined): HabitColor {
  if (raw && (HABIT_COLORS as readonly string[]).includes(raw)) return raw as HabitColor;
  return (raw && OLD_COLOR_TO_NEW[raw]) || "volt";
}

type WithRawStyle<T> = Omit<T, "color" | "icon"> & { color: string; icon: string | null };

export function normalizeHabit(h: WithRawStyle<Habit>): Habit {
  return { ...h, color: normalizeColor(h.color), icon: normalizeIcon(h.icon) };
}

export function normalizeHistoryHabit(h: WithRawStyle<HabitHistory>): HabitHistory {
  return { ...h, color: normalizeColor(h.color), icon: normalizeIcon(h.icon) };
}
