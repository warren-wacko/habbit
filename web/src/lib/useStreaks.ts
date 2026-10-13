import { useMemo } from "react";
import { addDays, toISO, todayLocal } from "./dates";
import { HISTORY_DAYS, useHistory } from "./habits";
import { computeStreaks } from "./streaks";

export type HabitStreak = {
  current: number;
  best: number;
  dates: Set<string>;
  skips: Set<string>;
  created: string; // the first day the habit counts
};

// Streaks per habit id, derived from the shared history query
export function useStreaks() {
  const history = useHistory();

  const byId = useMemo(() => {
    const today = todayLocal();
    const from = addDays(today, -(HISTORY_DAYS - 1));
    const map = new Map<number, HabitStreak>();
    for (const h of history.data?.habits ?? []) {
      const dates = new Set(h.dates);
      const skips = new Set(h.skips ?? []);
      map.set(h.id, {
        ...computeStreaks(dates, today, from, h.scheduleDays, skips),
        dates,
        skips,
        created: toISO(new Date(h.createdAt)),
      });
    }
    return map;
  }, [history.data]);

  return { history, byId };
}
