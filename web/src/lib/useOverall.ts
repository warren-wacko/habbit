import { useMemo } from "react";
import { addDays, todayLocal } from "./dates";
import { HISTORY_DAYS, useHistory } from "./habits";
import { computeOverall } from "./overall";

// Per-day totals and the overall streak, derived from the shared history query
export function useOverall() {
  const history = useHistory();

  const overall = useMemo(() => {
    if (!history.data) return null;
    const today = todayLocal();
    const from = addDays(today, -(HISTORY_DAYS - 1));
    return computeOverall(history.data.habits, today, from);
  }, [history.data]);

  return { history, overall };
}
