"use client";

import { addDays, formatDate } from "@/lib/dates";
import { dayRate, type ByDay } from "@/lib/stats";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

/** The last seven days, each with a bar for how much of that day got done */
export function DayStrip({
  date,
  today,
  windowEnd,
  min,
  byDay,
  onSelect,
  onShift,
}: {
  date: string;
  today: string;
  windowEnd: string; // the last day shown
  min: string | null; // the first day with anything to show: earlier days are disabled
  byDay: ByDay | undefined;
  onSelect: (day: string) => void;
  onShift: (deltaDays: number) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(windowEnd, -(6 - i)));

  return (
    <section aria-label="Choose a day" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="caps text-muted">Last 7 days</span>
        <span className="flex">
          <button
            onClick={() => onShift(-7)}
            disabled={min !== null && addDays(windowEnd, -6) <= min}
            aria-label="Previous week"
            className="icon-btn bare h-9"
          >
            <ChevronLeftIcon />
          </button>
          <button
            onClick={() => onShift(7)}
            disabled={windowEnd >= today}
            aria-label="Next week"
            className="icon-btn bare h-9"
          >
            <ChevronRightIcon />
          </button>
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const rate = dayRate(byDay?.get(d));
          const pct = rate === null ? 0 : Math.round(rate * 100);
          const label = formatDate(d, { weekday: "long", day: "numeric", month: "long" });
          return (
            <button
              key={d}
              onClick={() => onSelect(d)}
              disabled={d > today || (min !== null && d < min)}
              aria-pressed={d === date}
              aria-current={d === today ? "date" : undefined}
              aria-label={rate === null ? label : `${label}, ${pct}% done`}
              className="day"
            >
              <span className="text-[0.6875rem] font-bold uppercase opacity-75">
                {formatDate(d, { weekday: "short" })}
              </span>
              <span className="bar">
                <span className={pct === 100 ? "full" : ""} style={{ height: `${pct}%` }} />
              </span>
              <span className="display num text-base">{Number(d.slice(8, 10))}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
