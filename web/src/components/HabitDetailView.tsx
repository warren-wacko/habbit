"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { addDays, scheduleLabel, toISO, todayLocal } from "@/lib/dates";
import {
  habitDetailStats,
  monthGrid,
  monthTitle,
  shortDate,
  streakRuns,
} from "@/lib/habitStats";
import { HISTORY_DAYS, useDeleteHabit, useHistory, useNotes, useSetNote, useUpdateHabit } from "@/lib/habits";
import { newestFirst, noteFor } from "@/lib/notes";
import { HabitEditor } from "./HabitEditor";
import { HabitTile } from "./habitIcons";
import { ChevronLeftIcon, ChevronRightIcon, NoteIcon, PlusIcon } from "./icons";
import { NoteSheet } from "./NoteSheet";
import { Sheet } from "./Sheet";

const MONTH_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function HabitDetailView() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const today = todayLocal();
  const from = addDays(today, -(HISTORY_DAYS - 1));

  const history = useHistory();
  const update = useUpdateHabit();
  const remove = useDeleteHabit();
  const [monthBack, setMonthBack] = useState(0);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const notes = useNotes(id);
  const setNote = useSetNote();
  const [noteDate, setNoteDate] = useState<string | null>(null);

  const habit = history.data?.habits.find((h) => h.id === id);
  const input = useMemo(
    () =>
      habit && {
        scheduleDays: habit.scheduleDays,
        created: toISO(new Date(habit.createdAt)),
        dates: new Set(habit.dates),
        skips: new Set(habit.skips ?? []),
      },
    [habit],
  );

  if (history.isPending) {
    return (
      <>
        <div className="skeleton h-14" aria-busy="true" aria-label="Loading habit" />
        <div className="skeleton h-40" />
        <div className="skeleton h-72" />
      </>
    );
  }
  if (history.isError) {
    return (
      <p role="alert" className="alert">
        {history.error.message}
      </p>
    );
  }
  if (!habit || !input) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Link href="/" className="btn-ghost no-underline">
          <ChevronLeftIcon />
          Today
        </Link>
        <h1 className="display text-2xl">Habit not found</h1>
        <p className="text-muted">It may have been deleted or archived.</p>
      </div>
    );
  }

  const s = habitDetailStats(input, today, from);
  const runs = streakRuns(input, today, from)
    .filter((r) => r.ongoing || r.length >= 2)
    .slice(0, 5);
  const longestRun = Math.max(1, ...runs.map((r) => r.length));

  // calendar month shown
  const now = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 - monthBack, 1);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const { leading, cells } = monthGrid(year, month, input, today);
  const earliest = input.created > from ? input.created : from;
  const canGoBack = `${year}-${String(month).padStart(2, "0")}` > earliest.slice(0, 7);

  const schedule = scheduleLabel(habit.scheduleDays) || "Every day";
  const noteDays = new Set(notes.data?.map((n) => n.date));
  const stat = (value: string | number, label: string, volt = false) => (
    <div>
      <div className="display num text-[1.625rem]" style={volt ? { color: "var(--volt)" } : undefined}>
        {value}
      </div>
      <div className="caps lbl">{label}</div>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex h-11 items-center gap-0.5 font-bold text-ink no-underline hover:text-ink"
        >
          <ChevronLeftIcon strokeWidth={1.9} />
          Today
        </Link>
        <button onClick={() => setEditing(true)} className="btn-ghost h-10">
          Edit
        </button>
      </div>

      <header className="flex items-center gap-3.5">
        <HabitTile color={habit.color} icon={habit.icon} name={habit.name} size={60} />
        <div className="min-w-0">
          <h1 className="display wrap-break-word text-[1.75rem]">{habit.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {schedule} · tracking since {shortDate(input.created)}
          </p>
        </div>
      </header>

      <section className="hero grid grid-cols-3 gap-x-2 gap-y-[18px] !p-[18px]" aria-label="Habit stats">
        {stat(s.current, "Streak", true)}
        {stat(s.best, "Best")}
        {stat(s.rate30 === null ? "-" : `${Math.round(s.rate30 * 100)}%`, "30 days")}
        {stat(s.checkIns, "Done")}
        {stat(s.done30, "Done (30d)")}
        {stat(s.missed30, "Missed (30d)")}
      </section>

      <section className="card" aria-labelledby="calendar-heading">
        <div className="flex items-center justify-between">
          <h2 id="calendar-heading" className="display text-lg">
            {monthTitle(year, month)}
          </h2>
          <span className="flex">
            <button
              onClick={() => setMonthBack((m) => m + 1)}
              disabled={!canGoBack}
              aria-label="Previous month"
              className="icon-btn bare"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={() => setMonthBack((m) => m - 1)}
              disabled={monthBack === 0}
              aria-label="Next month"
              className="icon-btn bare"
            >
              <ChevronRightIcon />
            </button>
          </span>
        </div>
        <div className="cal text-center text-[0.6875rem] font-bold text-muted" aria-hidden="true">
          {MONTH_DAYS.map((d, i) => (
            <b key={i}>{d}</b>
          ))}
        </div>
        <div className="cal" role="group" aria-label={`${monthTitle(year, month)}. Tap a day to read or write its note`}>
          {Array.from({ length: leading }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {cells.map((c) => {
            const cls =
              c.state === "hit"
                ? "hit"
                : c.state === "miss"
                  ? "miss"
                  : c.state === "skip"
                    ? "skip"
                    : c.state === "off"
                      ? "off"
                      : c.state === "pending"
                        ? ""
                        : "future";
            const label =
              c.state === "hit"
                ? "done"
                : c.state === "miss"
                  ? "missed"
                  : c.state === "skip"
                    ? "skipped"
                    : c.state === "off"
                      ? "not scheduled"
                      : c.state === "pending"
                        ? "to do today"
                        : "";
            const hasNote = noteDays.has(c.date);
            const classes = `${cls} ${c.today ? "today" : ""} ${hasNote ? "has-note" : ""}`;
            // a day that has not happened yet cannot have a note
            if (c.state === "future") {
              return (
                <span key={c.date} className={classes}>
                  {c.day}
                </span>
              );
            }
            return (
              <button
                key={c.date}
                type="button"
                className={classes}
                aria-label={`${c.day} ${monthTitle(year, month)}${label ? `, ${label}` : ""}${
                  hasNote ? ", has a note" : ""
                }. ${hasNote ? "Edit" : "Add"} note`}
                onClick={() => {
                  setNote.reset();
                  setNoteDate(c.date);
                }}
              >
                {c.day}
                {hasNote && (
                  <span className="note-mark" aria-hidden="true">
                    <NoteIcon size={9} strokeWidth={2.6} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted">Tap any day to read, add or edit its note.</p>
        <div className="flex flex-wrap gap-3.5 text-xs text-muted" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5">
            <i className="size-3 rounded-full bg-volt" />
            Done
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-3 rounded-full border-[1.5px] border-danger-line" />
            Missed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-3 rounded-full border-[1.5px] border-dashed border-strong" />
            Skipped
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="grid size-3.5 place-items-center rounded-full bg-uv text-ground">
              <NoteIcon size={8} strokeWidth={2.6} />
            </span>
            Has a note
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-3 rounded-full bg-track" />
            Not scheduled
          </span>
        </div>
      </section>

      <section className="card" aria-labelledby="streaks-heading">
        <div className="flex items-center justify-between">
          <h2 id="streaks-heading" className="display text-lg">
            Streak history
          </h2>
          <span className="text-xs text-muted">Scheduled days in a row</span>
        </div>
        {runs.length === 0 ? (
          <p className="text-sm text-muted">No streaks yet. Two scheduled days in a row starts one.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {runs.map((r) => (
              <div key={r.start} className="grid grid-cols-[6rem_minmax(0,1fr)_1.875rem] items-center gap-2.5">
                <span className="text-[0.8125rem] text-muted">
                  {shortDate(r.start)} – {r.ongoing ? "now" : shortDate(r.end)}
                </span>
                <span className="h-3.5 overflow-hidden rounded-full bg-track">
                  <span
                    className={`block h-full rounded-full ${r.ongoing ? "bg-volt" : "bg-ink"}`}
                    style={{ width: `${(r.length / longestRun) * 100}%` }}
                  />
                </span>
                <span className="display num text-right text-[0.9375rem]">{r.length}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="notes-heading">
        <div className="flex items-center justify-between">
          <h2 id="notes-heading" className="display text-lg">
            Notes
          </h2>
          <button
            className="btn-ghost h-10"
            onClick={() => {
              setNote.reset();
              setNoteDate(today);
            }}
          >
            <PlusIcon size={16} strokeWidth={2.2} />
            {noteFor(notes.data, today) ? "Edit today" : "Add today"}
          </button>
        </div>
        {notes.isError && (
          <p role="alert" className="alert">
            {notes.error.message}
          </p>
        )}
        {notes.data && notes.data.length === 0 && (
          <p className="text-sm text-muted">
            No notes yet. Jot down how a day went, whether you finished it or not.
          </p>
        )}
        {notes.data && notes.data.length > 0 && (
          <ul className="flex flex-col">
            {newestFirst(notes.data)
              .slice(0, 20)
              .map((n) => (
                <li key={n.date} className="border-t border-line first:border-t-0">
                  <button
                    className="flex w-full flex-col gap-1 py-3 text-left"
                    onClick={() => {
                      setNote.reset();
                      setNoteDate(n.date);
                    }}
                    aria-label={`Edit the note from ${shortDate(n.date)}`}
                  >
                    <span className="caps text-xs text-muted">{shortDate(n.date)}</span>
                    <span className="line-clamp-3 whitespace-pre-wrap break-words text-[0.9375rem]">
                      {n.text}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        )}
      </section>

      {update.isError && (
        <p role="alert" className="alert">
          {update.error.message}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          className="btn-ghost h-12 text-[0.9375rem]"
          disabled={update.isPending}
          onClick={() => update.mutate({ id, archived: true }, { onSuccess: () => router.replace("/") })}
        >
          Archive
        </button>
        <button className="btn-danger text-[0.9375rem]" onClick={() => setConfirmDelete(true)}>
          Delete
        </button>
      </div>

      <NoteSheet
        open={noteDate !== null}
        onClose={() => setNoteDate(null)}
        title={noteDate ? `${habit.name} · ${noteDate === today ? "Today" : shortDate(noteDate)}` : "Note"}
        initial={noteDate ? noteFor(notes.data, noteDate) : ""}
        pending={setNote.isPending}
        error={setNote.isError ? setNote.error.message : null}
        onSave={(text) =>
          noteDate && setNote.mutate({ id, date: noteDate, text }, { onSuccess: () => setNoteDate(null) })
        }
      />

      <HabitEditor
        open={editing}
        habit={{
          ...habit,
          doneOnDate: false,
          skippedOnDate: false,
          amountOnDate: null,
          note: null,
          targetOnDate: habit.target,
        }}
        onClose={() => setEditing(false)}
      />

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this habit?">
        <p className="text-muted">
          &ldquo;{habit.name}&rdquo; and all of its history will be removed for good. To keep the
          history, archive it instead.
        </p>
        {remove.isError && (
          <p role="alert" className="alert">
            {remove.error.message}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost h-12" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          <button
            className="btn-danger"
            disabled={remove.isPending}
            onClick={() => remove.mutate(id, { onSuccess: () => router.replace("/") })}
          >
            {remove.isPending ? "Deleting..." : "Delete forever"}
          </button>
        </div>
      </Sheet>
    </>
  );
}

