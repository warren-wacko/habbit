"use client";

import Link from "next/link";
import { canCountAsDone } from "@/lib/counts";
import { isScheduled } from "@/lib/dates";
import { menuStatus } from "@/lib/menuStatus";
import type { Habit } from "@/lib/types";
import { HabitTile } from "./habitIcons";
import {
  ArchiveIcon,
  CheckIcon,
  ChevronRightIcon,
  NoteIcon,
  PencilIcon,
  SkipIcon,
  TrashIcon,
} from "./icons";
import { Sheet } from "./Sheet";

const ROW =
  "flex min-h-14 w-full items-center justify-between gap-3 border-t border-line px-1 text-left text-base font-semibold first:border-t-0";

/** What the "…" button on a habit opens: a short list of actions */
export function HabitMenu({
  habit,
  date,
  today,
  streak,
  onClose,
  onSkip,
  onCountAsDone,
  onNote,
  onEdit,
  onArchive,
  onDelete,
}: {
  habit: Habit | null;
  date: string; // the day being logged
  today: string;
  streak: number; // the habit's current streak
  onClose: () => void;
  onSkip: (h: Habit) => void;
  onCountAsDone: (h: Habit) => void;
  onNote: (h: Habit) => void;
  onEdit: (h: Habit) => void;
  onArchive: (h: Habit) => void;
  onDelete: (h: Habit) => void;
}) {
  const status = habit ? menuStatus(habit, date, today, streak) : null;

  return (
    <Sheet open={!!habit} onClose={onClose} title={habit?.name ?? "Habit"}>
      {habit && status && (
        <div className="flex flex-col">
          <div className="flex items-center gap-3 pb-3">
            <HabitTile color={habit.color} icon={habit.icon} name={habit.name} size={44} />
            <div className="min-w-0">
              <p className="text-[0.9375rem] font-bold">{status.state}</p>
              <p className="text-sm text-muted">{status.about}</p>
            </div>
          </div>
          {habit.note && (
            <p className="mb-3 line-clamp-3 whitespace-pre-wrap break-words rounded-xl bg-track px-3.5 py-2.5 text-sm">
              {habit.note}
            </p>
          )}
          <Link
            href={`/habits/${habit.id}`}
            // close the menu on the way out: a page you leave is kept alive in the
            // background, so an open menu would still be open when you come back
            onClick={onClose}
            className={`${ROW} text-ink no-underline hover:text-ink`}
          >
            View details
            <ChevronRightIcon />
          </Link>
          {canCountAsDone(habit) && (
            <button className={ROW} onClick={() => onCountAsDone(habit)}>
              Count as done
              <CheckIcon />
            </button>
          )}
          {(habit.skippedOnDate || (isScheduled(date, habit.scheduleDays) && !habit.doneOnDate)) && (
            <button className={ROW} onClick={() => onSkip(habit)}>
              {habit.skippedOnDate
                ? "Undo skip"
                : date === today
                  ? "Skip today"
                  : "Skip this day"}
              <SkipIcon />
            </button>
          )}
          <button className={ROW} onClick={() => onNote(habit)}>
            {habit.note ? "Edit note" : "Add note"}
            <NoteIcon />
          </button>
          <button className={ROW} onClick={() => onEdit(habit)}>
            Edit
            <PencilIcon />
          </button>
          <button className={ROW} onClick={() => onArchive(habit)}>
            Archive
            <ArchiveIcon />
          </button>
          <button className={`${ROW} text-danger`} onClick={() => onDelete(habit)}>
            Delete
            <TrashIcon />
          </button>
        </div>
      )}
    </Sheet>
  );
}
