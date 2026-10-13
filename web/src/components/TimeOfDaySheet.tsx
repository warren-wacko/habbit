"use client";

import { TIME_LABEL, TIME_OF_DAY, type TimeOfDay } from "@/lib/timeOfDay";
import { CheckIcon } from "./icons";
import { Sheet } from "./Sheet";

const ROW =
  "flex min-h-14 w-full items-center justify-between gap-3 border-t border-line px-1 text-left text-base font-semibold first:border-t-0";

/** Pick when in the day a habit belongs, from a short list in the app's own style */
export function TimeOfDaySheet({
  open,
  onClose,
  habitName,
  value,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  habitName: string;
  value: TimeOfDay;
  onPick: (t: TimeOfDay) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={`${habitName} · time of day`}>
      <div className="flex flex-col" role="group" aria-label="Time of day">
        {TIME_OF_DAY.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={value === t}
            className={ROW}
            onClick={() => onPick(t)}
          >
            {TIME_LABEL[t]}
            {value === t && (
              <span className="grid size-6 place-items-center rounded-full bg-volt text-on-volt">
                <CheckIcon size={14} strokeWidth={3} />
              </span>
            )}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
