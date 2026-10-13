import { z } from "zod";
import { MAX_ORDER_IDS, TIME_OF_DAY } from "../lib/order.js";

const dayString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date");

export const HABIT_COLORS = [
  "volt",
  "aqua",
  "sky",
  "violet",
  "rose",
  "sand",
] as const;

// The icon is stored as a key; the website maps each key to a drawn icon
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

const habitName = z.string().trim().min(1, "Name is required").max(100);
const habitColor = z.enum(HABIT_COLORS);
// one of the icon keys; null clears it
const habitIcon = z.enum(HABIT_ICON_KEYS).nullable();
// bitmask: bit 0 = Monday ... bit 6 = Sunday; at least one day must be set
const scheduleDays = z.number().int().min(1).max(127);
// how many to reach per day, and an optional label for it; null clears the label
const target = z.number().int().min(1).max(10_000);
const unit = z.string().trim().max(20).nullable();
const timeOfDay = z.enum(TIME_OF_DAY);

export const habitBody = z.object({
  name: habitName,
  color: habitColor.optional(),
  icon: habitIcon.optional(),
  scheduleDays: scheduleDays.optional(),
  target: target.optional(),
  unit: unit.optional(),
  timeOfDay: timeOfDay.optional(),
});

export const habitUpdateBody = z
  .object({
    name: habitName.optional(),
    color: habitColor.optional(),
    icon: habitIcon.optional(),
    scheduleDays: scheduleDays.optional(),
    target: target.optional(),
    unit: unit.optional(),
    timeOfDay: timeOfDay.optional(),
    archived: z.boolean().optional(),
    // the caller's local today: lowering the goal re-checks that day
    today: dayString.optional(),
  })
  .refine(
    (b) => Object.entries(b).some(([k, v]) => k !== "today" && v !== undefined),
    "Nothing to update",
  );

export const idParams = z.object({
  id: z.coerce.number().int().positive(),
});

export const dayQuery = z.object({
  date: dayString.optional(),
  // "true" lists only archived habits; otherwise only active ones
  archived: z.enum(["true", "false"]).optional(),
});

export const toggleBody = z.object({
  date: dayString.optional(),
});

// Set how much of a counted habit was done on a day (0 clears it)
export const progressBody = z.object({
  date: dayString,
  amount: z.number().int().min(0).max(100_000),
});

// The habit ids in their new order, plus any time-of-day changes made while arranging them
export const orderBody = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(MAX_ORDER_IDS),
  timeOfDay: z.record(z.string(), timeOfDay).optional(),
});

// Set the note on one day of a habit; empty text removes it
export const MAX_NOTE = 280;
export const noteBody = z.object({
  date: dayString,
  text: z.string().trim().max(MAX_NOTE),
});

// Count a day with some progress as done, at what was done
export const countAsDoneBody = z.object({
  date: dayString,
});

// Skip (or un-skip) one day of one habit
export const skipBody = z.object({
  date: dayString,
});

export const statsQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(7),
  // the caller's local "today", so the window matches what they see on screen
  today: dayString.optional(),
});

// Which days did I complete each habit? Capped at a year so one request stays small.
export const historyQuery = z
  .object({
    from: dayString,
    to: dayString,
    // "true" returns only archived habits instead of the active ones
    archived: z.enum(["true", "false"]).optional(),
  })
  .refine((q) => q.from <= q.to, "from must not be after to")
  .refine(
    (q) => Date.parse(q.to) - Date.parse(q.from) <= 365 * 24 * 60 * 60 * 1000,
    "Range is limited to 366 days",
  );

// Download everything: JSON is the full backup, CSV is one row per completed day
export const exportQuery = z.object({
  format: z.enum(["json", "csv"]).default("json"),
});

// Plain-language insights over the last `days` days (at least 60, so the
// 30-day trend has a previous period to compare with)
export const insightsQuery = z.object({
  days: z.coerce.number().int().min(60).max(365).default(90),
  today: dayString.optional(),
});

export type HabitBody = z.infer<typeof habitBody>;
