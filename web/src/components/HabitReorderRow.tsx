"use client";

import { useState } from "react";
import { TIME_LABEL, type TimeOfDay } from "@/lib/timeOfDay";
import type { Habit } from "@/lib/types";
import { HabitTile } from "./habitIcons";
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon } from "./icons";
import { TimeOfDaySheet } from "./TimeOfDaySheet";

/**
 * A habit while reordering: its name, a time-of-day dropdown to move it to another group,
 * and ▲ ▼ buttons to move it within its group
 */
export function HabitReorderRow({
  habit: h,
  canUp,
  canDown,
  onUp,
  onDown,
  onTime,
}: {
  habit: Habit;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
  onTime: (t: TimeOfDay) => void;
}) {
  const [picking, setPicking] = useState(false);
  return (
    <li
      className="habit"
      data-done={false}
      style={{ "--hc": `var(--h-${h.color})` } as React.CSSProperties}
    >
      <HabitTile color={h.color} icon={h.icon} name={h.name} />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
        <span className="wrap-break-word text-[0.9375rem] font-bold leading-tight">{h.name}</span>
        <button
          type="button"
          onClick={() => setPicking(true)}
          aria-label={`Time of day for ${h.name}: ${TIME_LABEL[h.timeOfDay]}. Change`}
          className="chip gap-1.5 py-0 pl-3 pr-2.5 text-xs"
        >
          {TIME_LABEL[h.timeOfDay]}
          <ChevronDownIcon size={14} strokeWidth={2.2} />
        </button>
      </span>
      <button
        type="button"
        className="step"
        aria-label={`Move ${h.name} up`}
        disabled={!canUp}
        onClick={onUp}
      >
        <ArrowUpIcon size={18} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        className="step"
        aria-label={`Move ${h.name} down`}
        disabled={!canDown}
        onClick={onDown}
      >
        <ArrowDownIcon size={18} strokeWidth={2.2} />
      </button>

      <TimeOfDaySheet
        open={picking}
        onClose={() => setPicking(false)}
        habitName={h.name}
        value={h.timeOfDay}
        onPick={(t) => {
          setPicking(false);
          if (t !== h.timeOfDay) onTime(t);
        }}
      />
    </li>
  );
}
