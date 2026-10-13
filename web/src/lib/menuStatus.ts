import { isCounted } from "./counts";
import { isScheduled, scheduleLabel } from "./dates";

type MenuHabit = {
  scheduleDays: number;
  target: number;
  targetOnDate: number;
  unit: string | null;
  doneOnDate: boolean;
  skippedOnDate: boolean;
  amountOnDate: number | null;
};

/**
 * The two lines under a habit's name in its "…" menu:
 * - how the chosen day stands ("Done today", "5 of 8 glasses so far", "Skipped today", ...)
 * - what the habit is (its schedule, its daily goal if it counts, and its streak)
 */
export function menuStatus(
  h: MenuHabit,
  date: string,
  today: string,
  streak: number,
): { state: string; about: string } {
  const isToday = date === today;
  const when = isToday ? "today" : "that day";

  let state: string;
  if (h.skippedOnDate && !h.doneOnDate) state = `Skipped ${when}`;
  else if (h.doneOnDate) state = `Done ${when}`;
  else if (isCounted(h) && (h.amountOnDate ?? 0) > 0) {
    const unit = h.unit ? ` ${h.unit}` : "";
    state = `${h.amountOnDate} of ${h.target}${unit}${isToday ? " so far" : ""}`;
  } else if (!isScheduled(date, h.scheduleDays)) state = "Rest day";
  else state = isToday ? "Not done yet" : "Not done";

  const goal = h.target > 1 ? `${h.target}${h.unit ? ` ${h.unit}` : " times"} a day` : "";
  const about = [
    scheduleLabel(h.scheduleDays) || "Every day",
    goal,
    streak >= 1 ? `${streak}-day streak` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return { state, about };
}
