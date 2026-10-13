"use client";

import { useState } from "react";
import { monthInRange, pickerMonth, shiftMonth } from "@/lib/datePicker";
import { addDays } from "@/lib/dates";
import { HISTORY_DAYS } from "@/lib/habits";
import { monthTitle } from "@/lib/habitStats";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";
import { Sheet } from "./Sheet";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/** "Pick a day": a month grid in the app's own style, limited to the days that can be edited */
export function DatePickerSheet({
  open,
  onClose,
  selected,
  today,
  earliest,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  selected: string;
  today: string;
  earliest: string | null; // the first day with anything to show
  onPick: (day: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Pick a day">
      <Picker selected={selected} today={today} earliest={earliest} onPick={onPick} />
    </Sheet>
  );
}

function Picker({
  selected,
  today,
  earliest,
  onPick,
}: {
  selected: string;
  today: string;
  earliest: string | null;
  onPick: (day: string) => void;
}) {
  // the oldest day with data: the same year the rest of the app looks back over
  const yearAgo = addDays(today, -(HISTORY_DAYS - 1));
  const min = earliest && earliest > yearAgo ? earliest : yearAgo;
  const [view, setView] = useState({
    year: Number(selected.slice(0, 4)),
    month: Number(selected.slice(5, 7)),
  });
  const { leading, cells } = pickerMonth(view.year, view.month, today, min);
  const prev = shiftMonth(view.year, view.month, -1);
  const next = shiftMonth(view.year, view.month, 1);
  const canPrev = monthInRange(prev.year, prev.month, today, min);
  const canNext = monthInRange(next.year, next.month, today, min);
  const title = monthTitle(view.year, view.month);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="display text-lg" aria-live="polite">
          {title}
        </h3>
        <span className="flex">
          <button
            type="button"
            onClick={() => setView(prev)}
            disabled={!canPrev}
            aria-label="Previous month"
            className="icon-btn bare"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            onClick={() => setView(next)}
            disabled={!canNext}
            aria-label="Next month"
            className="icon-btn bare"
          >
            <ChevronRightIcon />
          </button>
        </span>
      </div>

      <div className="cal text-center text-[0.6875rem] font-bold text-muted" aria-hidden="true">
        {WEEKDAYS.map((d, i) => (
          <b key={i}>{d}</b>
        ))}
      </div>
      <div className="cal" role="group" aria-label={title}>
        {Array.from({ length: leading }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {cells.map((c) => (
          <button
            key={c.date}
            type="button"
            disabled={c.disabled}
            aria-pressed={c.date === selected}
            aria-label={`${c.day} ${title}${c.today ? ", today" : ""}`}
            className={`${c.date === selected ? "hit" : c.disabled ? "future" : ""} ${
              c.today ? "today" : ""
            }`}
            onClick={() => onPick(c.date)}
          >
            {c.day}
          </button>
        ))}
      </div>

      <button type="button" className="btn-ghost h-12" onClick={() => onPick(today)}>
        Today
      </button>
    </div>
  );
}
