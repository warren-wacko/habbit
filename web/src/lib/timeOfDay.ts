// When in the day a habit belongs, and how the list is grouped and reordered around it.

export const TIME_OF_DAY = ["anytime", "morning", "afternoon", "evening"] as const;
export type TimeOfDay = (typeof TIME_OF_DAY)[number];

export const TIME_LABEL: Record<TimeOfDay, string> = {
  anytime: "Anytime",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

// The order the groups appear in on Today
const GROUP_ORDER: TimeOfDay[] = ["morning", "afternoon", "evening", "anytime"];

type Placed = { id: number; timeOfDay: TimeOfDay };

export type Group<T extends Placed> = { key: TimeOfDay; label: string; habits: T[] };

/** The habits split into time-of-day groups, each keeping its order. Empty groups are left out. */
export function groupByTimeOfDay<T extends Placed>(habits: readonly T[]): Group<T>[] {
  return GROUP_ORDER.map((key) => ({
    key,
    label: TIME_LABEL[key],
    habits: habits.filter((h) => h.timeOfDay === key),
  })).filter((g) => g.habits.length > 0);
}

/** Headings only help once at least one habit has a time of day; all "Anytime" stays plain */
export function showHeadings(groups: readonly { key: TimeOfDay }[]): boolean {
  return groups.some((g) => g.key !== "anytime");
}

/**
 * The ids in their new order after moving one habit up or down among the habits of its own
 * time-of-day group (it swaps with the nearest neighbour in that group). Returns null when
 * it is already first or last in its group.
 */
export function moveWithinGroup(
  habits: readonly Placed[],
  id: number,
  direction: "up" | "down",
): number[] | null {
  const from = habits.findIndex((h) => h.id === id);
  if (from === -1) return null;
  const step = direction === "up" ? -1 : 1;
  let to = from + step;
  while (to >= 0 && to < habits.length && habits[to].timeOfDay !== habits[from].timeOfDay) to += step;
  if (to < 0 || to >= habits.length) return null;

  const ids = habits.map((h) => h.id);
  [ids[from], ids[to]] = [ids[to], ids[from]];
  return ids;
}

/**
 * The ids in their new order after a habit joins another time-of-day group: it lands at
 * the end of that group (or at the very end when the group is empty). `habits` should
 * already carry each habit's current time of day, and the moved habit's old one.
 */
export function moveToGroup(habits: readonly Placed[], id: number, target: TimeOfDay): number[] {
  const rest = habits.filter((h) => h.id !== id);
  let last = -1;
  rest.forEach((h, i) => {
    if (h.timeOfDay === target) last = i;
  });
  const ids = rest.map((h) => h.id);
  ids.splice(last === -1 ? ids.length : last + 1, 0, id);
  return ids;
}
