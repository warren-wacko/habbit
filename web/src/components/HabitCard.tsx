"use client";

import Link from "next/link";
import { isCounted } from "@/lib/counts";
import { addDays, isScheduled, scheduleLabel } from "@/lib/dates";
import type { Habit } from "@/lib/types";
import { CountControl } from "./CountControl";
import { HabitTile } from "./habitIcons";
import { CheckIcon, MoreIcon } from "./icons";

type Props = {
  habit: Habit;
  date: string; // the day being logged
  today: string;
  dates: ReadonlySet<string> | undefined; // days this habit was completed
  skips: ReadonlySet<string> | undefined; // days skipped on purpose
  created: string | undefined; // the first day it counts
  streak: number;
  onToggle: () => void;
  onMenu: () => void;
};

type Square = "hit" | "miss" | "skip" | "off" | "today";

/** The seven days ending on `date`, as small squares (the last one is the day being logged) */
function squares(
  h: Habit,
  date: string,
  today: string,
  dates: Props["dates"],
  skips: Props["skips"],
  created: Props["created"],
): Square[] {
  return Array.from({ length: 7 }, (_, i): Square => {
    const d = addDays(date, -(6 - i));
    const scheduled = isScheduled(d, h.scheduleDays);
    if (i === 6) {
      if (h.doneOnDate) return "hit";
      if (!scheduled) return "off";
      if (h.skippedOnDate) return "skip";
      return d === today ? "today" : "miss";
    }
    if (created && d < created) return "off";
    if (dates?.has(d)) return "hit";
    if (scheduled && skips?.has(d)) return "skip";
    return scheduled ? "miss" : "off";
  });
}

export function HabitCard({ habit: h, date, today, dates, skips, created, streak, onToggle, onMenu }: Props) {
  const restIdle = !isScheduled(date, h.scheduleDays) && !h.doneOnDate;
  const skipped = h.skippedOnDate && !h.doneOnDate && !restIdle;
  const meta =
    [
      restIdle ? "Rest day" : "",
      skipped ? "Skipped" : "",
      streak >= 2 && !restIdle && !skipped ? `${streak}-day streak` : "",
      scheduleLabel(h.scheduleDays),
    ]
      .filter(Boolean)
      .join(" · ") || "Every day";

  return (
    <li
      className="habit"
      data-done={h.doneOnDate}
      data-rest={restIdle || skipped}
      style={{ "--hc": `var(--h-${h.color})` } as React.CSSProperties}
    >
      <label className="relative grid size-11 shrink-0 cursor-pointer place-items-center">
        <input
          type="checkbox"
          aria-label={`Mark ${h.name} as done`}
          checked={h.doneOnDate}
          onChange={onToggle}
          className="check-input absolute inset-0 size-full cursor-pointer opacity-0"
        />
        <span className="check-box" aria-hidden="true">
          <CheckIcon className="check-mark" size={16} strokeWidth={3} />
        </span>
      </label>

      <HabitTile color={h.color} icon={h.icon} name={h.name} />

      <Link
        href={`/habits/${h.id}`}
        className="flex min-w-0 flex-1 flex-col gap-[5px] text-inherit no-underline hover:text-inherit"
      >
        <span className="wrap-break-word text-[0.9375rem] font-bold leading-tight">{h.name}</span>
        <span className="meta flex items-center gap-2 text-xs font-semibold">
          <span className="hist" aria-hidden="true">
            {squares(h, date, today, dates, skips, created).map((s, i) => (
              <span key={i} className={s} />
            ))}
          </span>
          {meta}
        </span>
      </Link>

      <button
        type="button"
        onClick={onMenu}
        aria-label={`More options for ${h.name}`}
        className="more"
      >
        <MoreIcon />
      </button>

      {isCounted(h) && !skipped && !restIdle && (
        <CountControl key={`${h.id}-${date}`} habit={h} date={date} />
      )}
    </li>
  );
}
