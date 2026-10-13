// Rules for reordering habits. Pure, so they can be tested without a database.

export const TIME_OF_DAY = ["anytime", "morning", "afternoon", "evening"] as const;
export type TimeOfDay = (typeof TIME_OF_DAY)[number];
export const MAX_ORDER_IDS = 200;

export type OrderCheck = { ok: true } | { ok: false; reason: string };

/**
 * A reorder request is a list of habit ids in their new order. It is only acceptable
 * when it has no duplicates and every id belongs to the signed-in user, so nobody can
 * reorder (or probe for) someone else's habits.
 */
export function checkOrder(ids: readonly number[], ownedIds: ReadonlySet<number>): OrderCheck {
  if (ids.length === 0) return { ok: false, reason: "Nothing to reorder" };
  if (ids.length > MAX_ORDER_IDS) return { ok: false, reason: "Too many habits" };
  if (new Set(ids).size !== ids.length) return { ok: false, reason: "Each habit can appear once" };
  if (ids.some((id) => !ownedIds.has(id))) return { ok: false, reason: "Habit not found" };
  return { ok: true };
}

/**
 * Time-of-day changes sent along with a reorder: a map of habit id to its new time of day.
 * Every key must be a whole number that is also in the order list, so a request can only
 * change habits it is also reordering (which were already checked to be the user's own).
 */
export function checkTimes(
  times: Readonly<Record<string, string>>,
  ids: readonly number[],
): OrderCheck {
  const inList = new Set(ids);
  for (const key of Object.keys(times)) {
    const id = Number(key);
    if (!Number.isInteger(id) || !inList.has(id)) {
      return { ok: false, reason: "A time of day was set for a habit that is not in the list" };
    }
  }
  return { ok: true };
}

/** The sortOrder a new habit gets so it lands last: one past the highest in use */
export function nextSortOrder(currentMax: number | null): number {
  return (currentMax ?? -1) + 1;
}
