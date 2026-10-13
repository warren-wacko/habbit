"use client";

import { useAddHabit } from "@/lib/habits";
import { QUICK_START } from "@/lib/quickStart";
import { HabitTile } from "./habitIcons";
import { PlusIcon } from "./icons";

/** Shown when there are no habits yet: start from one tap, or make your own */
export function EmptyHabits({ onNew }: { onNew: () => void }) {
  const add = useAddHabit();

  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-strong px-5 py-8 text-center">
      <span className="caps text-muted">Nothing logged yet</span>
      <p className="display text-2xl">Start your streak</p>
      <p className="max-w-64 text-sm text-muted">
        Add a habit and tick it off each day.
      </p>
      <ul className="flex flex-wrap justify-center gap-2">
        {QUICK_START.map((q) => (
          <li key={q.name}>
            <button
              className="chip gap-2 pl-2"
              disabled={add.isPending}
              onClick={() => add.mutate({ name: q.name, icon: q.icon, color: q.color })}
            >
              <HabitTile color={q.color} icon={q.icon} name={q.name} size={26} />
              {q.name}
            </button>
          </li>
        ))}
      </ul>
      {add.isError && (
        <p role="alert" className="alert">
          {add.error.message}
        </p>
      )}
      <button onClick={onNew} className="btn btn-volt mt-1">
        <PlusIcon size={18} strokeWidth={2.2} />
        New habit
      </button>
    </div>
  );
}
