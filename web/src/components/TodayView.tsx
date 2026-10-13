"use client";

import { useEffect, useState } from "react";
import { addDays, formatDate, isScheduled } from "@/lib/dates";
import {
  useCountAsDone,
  useHabits,
  useReorderHabits,
  useSetNote,
  useSkipHabit,
  useToggleHabit,
  useUpdateHabit,
} from "@/lib/habits";
import { windowTotals } from "@/lib/stats";
import type { Habit } from "@/lib/types";
import { greetingLine, useHour } from "@/lib/greeting";
import { earliestStart, existedOn } from "@/lib/habitStart";
import { onNewHabitRequest, takeNewHabitRequest } from "@/lib/newHabitSignal";
import { useMe } from "@/lib/useMe";
import { useOverall } from "@/lib/useOverall";
import { useStreaks } from "@/lib/useStreaks";
import {
  groupByTimeOfDay,
  moveToGroup,
  moveWithinGroup,
  showHeadings,
  type TimeOfDay,
} from "@/lib/timeOfDay";
import { useToday } from "@/lib/useToday";
import { useUndoableDelete } from "@/lib/useUndoableDelete";
import { DayStrip } from "./DayStrip";
import { DatePickerSheet } from "./DatePickerSheet";
import { EmptyHabits } from "./EmptyHabits";
import { HabitCard } from "./HabitCard";
import { HabitEditor } from "./HabitEditor";
import { HabitMenu } from "./HabitMenu";
import { HabitReorderRow } from "./HabitReorderRow";
import { CalendarIcon, CheckIcon, PlusIcon, ShareIcon } from "./icons";
import { ScoreCard } from "./ScoreCard";
import { ShareSheet } from "./ShareSheet";
import { NoteSheet } from "./NoteSheet";
import { Sheet } from "./Sheet";
import { UndoToast } from "./UndoToast";

function dayTitle(date: string, today: string) {
  if (date === today) return "Today";
  if (date === addDays(today, -1)) return "Yesterday";
  return formatDate(date, { weekday: "long" });
}

export function TodayView() {
  const today = useToday();
  // null means "follow today", so the screen moves on by itself when midnight passes
  const [picked, setPicked] = useState<string | null>(null);
  const [stripEnd, setStripEnd] = useState<string | null>(null);
  const date = picked ?? today;
  const windowEnd = stripEnd ?? today; // last day in the strip
  const [editor, setEditor] = useState<Habit | "new" | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [sharing, setSharing] = useState(false);
  const [picking, setPicking] = useState(false);

  const habits = useHabits(date);
  const toggle = useToggleHabit();
  const skip = useSkipHabit();
  const countAsDone = useCountAsDone();
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const setNote = useSetNote();
  const [noteId, setNoteId] = useState<number | null>(null);
  const update = useUpdateHabit();
  const reorder = useReorderHabits();
  // while reordering: the order being arranged, and any time-of-day changes (null when not reordering)
  const [draft, setDraft] = useState<{ ids: number[]; times: Record<number, TimeOfDay> } | null>(null);
  const del = useUndoableDelete();
  const { history, byId } = useStreaks();
  // nothing to show before the first habit began; until that is known, no limit (no flicker)
  const firstDay = history.data
    ? earliestStart([...byId.values()].map((s) => s.created), today)
    : null;
  const { overall } = useOverall();
  const me = useMe();
  const hour = useHour();

  // the tour's "Add my first habit" asks Today to open the new-habit screen
  useEffect(() => {
    const open = () => setEditor("new");
    if (takeNewHabitRequest()) queueMicrotask(open);
    return onNewHabitRequest(open);
  }, []);

  // a habit is not shown on days before it was created
  const visible = habits.data?.filter(
    (h) => !del.hidden.includes(h.id) && existedOn(byId.get(h.id)?.created, date),
  );
  // Habits on a rest day or a skipped day only count if you did them anyway
  const relevant = visible?.filter(
    (h) => h.doneOnDate || (isScheduled(date, h.scheduleDays) && !h.skippedOnDate),
  );
  // the list as shown: the arrangement in progress while reordering, otherwise the saved order
  const shown =
    visible && draft
      ? [
          ...draft.ids.flatMap((id) => visible.filter((h) => h.id === id)),
          ...visible.filter((h) => !draft.ids.includes(h.id)),
        ].map((h) => (draft.times[h.id] ? { ...h, timeOfDay: draft.times[h.id] } : h))
      : visible;
  const groups = groupByTimeOfDay(shown ?? []);
  const menu = habits.data?.find((h) => h.id === menuId) ?? null;
  const confirming = habits.data?.find((h) => h.id === confirmId) ?? null;
  const noting = habits.data?.find((h) => h.id === noteId) ?? null;
  const total = relevant?.length ?? 0;
  const done = relevant?.filter((h) => h.doneOnDate).length ?? 0;

  function select(day: string) {
    if (firstDay && day < firstDay) return;
    setPicked(day >= today ? null : day);
    // keep the chosen day inside the strip
    if (day > windowEnd || day < addDays(windowEnd, -6)) {
      const end = addDays(day, 3);
      setStripEnd(end >= today ? null : end);
    }
  }

  function shift(delta: number) {
    let end = addDays(windowEnd, delta);
    // do not slide past the first habit's day
    if (firstDay && addDays(end, -6) < firstDay) end = addDays(firstDay, 6);
    setStripEnd(end >= today ? null : end);
  }

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="caps text-xs text-muted">
            {formatDate(date, { weekday: "short", day: "numeric", month: "short" })}
          </div>
          <h1 className="display text-[2.125rem]">{dayTitle(date, today)}</h1>
          {/* the greeting is for today only; other days are just a date */}
          {date === today && (
            <p className="mt-1.5 truncate text-sm text-muted">
              {greetingLine(hour, me.data?.nickname)}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSharing(true)}
            disabled={total === 0}
            aria-label="Share this day as a picture"
            className="icon-btn"
          >
            <ShareIcon />
          </button>
          <button onClick={() => setPicking(true)} aria-label="Pick a date" className="icon-btn">
            <CalendarIcon />
          </button>
        </div>
      </header>

      <DatePickerSheet
        open={picking}
        onClose={() => setPicking(false)}
        selected={date}
        today={today}
        earliest={firstDay}
        onPick={(day) => {
          select(day);
          setPicking(false);
        }}
      />

      <ScoreCard
        done={done}
        total={total}
        streak={overall?.current ?? 0}
        best={overall?.best ?? 0}
        weekRate={overall ? windowTotals(overall.byDay, date, 7).rate : null}
      />

      <DayStrip
        date={date}
        today={today}
        windowEnd={windowEnd}
        min={firstDay}
        byDay={overall?.byDay}
        onSelect={select}
        onShift={shift}
      />

      <section className="flex flex-col gap-2.5" aria-labelledby="habits-heading">
        <div className="flex items-center justify-between">
          <h2 id="habits-heading" className="display flex items-center gap-2.5 text-xl">
            Habits
            {total > 0 && (
              <span
                role="status"
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold [font-stretch:100%] ${
                  done === total ? "bg-volt text-on-volt" : "bg-track text-muted"
                }`}
              >
                {done === total ? (
                  <>
                    <CheckIcon size={12} strokeWidth={3} />
                    Done
                  </>
                ) : (
                  `${total - done} left`
                )}
              </span>
            )}
          </h2>
          {draft ? (
            <div className="flex gap-2">
              <button className="btn-ghost h-10" onClick={() => setDraft(null)}>
                Cancel
              </button>
              <button
                className="btn btn-volt btn-sm"
                disabled={reorder.isPending}
                onClick={() => {
                  const ids = shown?.map((h) => h.id) ?? [];
                  const sameOrder = ids.every((id, i) => id === visible?.[i]?.id);
                  const sameTimes = Object.keys(draft.times).length === 0;
                  if (sameOrder && sameTimes) return setDraft(null);
                  reorder.mutate(
                    { ids, ...(sameTimes ? {} : { timeOfDay: draft.times }) },
                    { onSuccess: () => setDraft(null) },
                  );
                }}
              >
                {reorder.isPending ? "Saving..." : "Done"}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              {visible && visible.length > 1 && (
                <button
                  className="btn-ghost h-10"
                  onClick={() => {
                    reorder.reset();
                    setDraft({ ids: visible.map((h) => h.id), times: {} });
                  }}
                >
                  Reorder
                </button>
              )}
              <button onClick={() => setEditor("new")} className="btn btn-volt btn-sm">
                <PlusIcon size={16} strokeWidth={2.2} />
                New
              </button>
            </div>
          )}
        </div>

        {(toggle.isError || skip.isError || countAsDone.isError) && (
          <p role="alert" className="alert">
            Couldn&apos;t save that change. Try again.
          </p>
        )}
        {del.isError && (
          <p role="alert" className="alert">
            Couldn&apos;t delete that habit. It&apos;s back in your list.
          </p>
        )}
        {reorder.isError && (
          <p role="alert" className="alert">
            {reorder.error.message}
          </p>
        )}
        {update.isError && (
          <p role="alert" className="alert">
            {update.error.message}
          </p>
        )}

        {habits.isPending && (
          <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading habits">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-[4.25rem]" />
            ))}
          </div>
        )}
        {habits.isError && (
          <p role="alert" className="alert">
            {habits.error.message}
          </p>
        )}
        {visible?.length === 0 && <EmptyHabits onNew={() => setEditor("new")} />}

        {shown && shown.length > 0 && (
          <div className="flex flex-col gap-4">
            {groups.map((g) => (
              <div key={g.key} className="flex flex-col gap-2">
                {showHeadings(groups) && <h3 className="caps text-xs text-muted">{g.label}</h3>}
                <ul className="flex flex-col gap-2">
                  {g.habits.map((h, i) => {
                    if (draft) {
                      return (
                        <HabitReorderRow
                          key={h.id}
                          habit={h}
                          canUp={i > 0}
                          canDown={i < g.habits.length - 1}
                          onUp={() =>
                            setDraft({ ...draft, ids: moveWithinGroup(shown, h.id, "up") ?? draft.ids })
                          }
                          onDown={() =>
                            setDraft({ ...draft, ids: moveWithinGroup(shown, h.id, "down") ?? draft.ids })
                          }
                          onTime={(t) => {
                            const original = visible?.find((x) => x.id === h.id)?.timeOfDay;
                            const times = { ...draft.times };
                            if (t === original) delete times[h.id];
                            else times[h.id] = t;
                            setDraft({ ids: moveToGroup(shown, h.id, t), times });
                          }}
                        />
                      );
                    }
                    const s = byId.get(h.id);
                    return (
                      <HabitCard
                        key={h.id}
                        habit={h}
                        date={date}
                        today={today}
                        dates={s?.dates}
                        skips={s?.skips}
                        created={s?.created}
                        streak={s?.current ?? 0}
                        onToggle={() => toggle.mutate({ id: h.id, date })}
                        onMenu={() => setMenuId(h.id)}
                      />
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <HabitMenu
        habit={menu}
        date={date}
        today={today}
        streak={menu ? (byId.get(menu.id)?.current ?? 0) : 0}
        onClose={() => setMenuId(null)}
        onSkip={(h) => {
          setMenuId(null);
          skip.mutate({ id: h.id, date });
        }}
        onCountAsDone={(h) => {
          setMenuId(null);
          setConfirmId(h.id);
        }}
        onNote={(h) => {
          setMenuId(null);
          setNote.reset();
          setNoteId(h.id);
        }}
        onEdit={(h) => {
          setMenuId(null);
          setEditor(h);
        }}
        onArchive={(h) => {
          setMenuId(null);
          update.mutate({ id: h.id, archived: true });
        }}
        onDelete={(h) => {
          setMenuId(null);
          del.start(h);
        }}
      />
      <Sheet
        open={confirming !== null}
        onClose={() => setConfirmId(null)}
        title={date === today ? "Count today as done?" : "Count this day as done?"}
      >
        {confirming && (
          <div className="flex flex-col gap-4">
            <p className="text-muted">
              You&apos;ve done {confirming.amountOnDate} of {confirming.target}
              {confirming.unit ? ` ${confirming.unit}` : ""}. Counting it as done sets{" "}
              {date === today ? "today's" : "this day's"} goal to {confirming.amountOnDate} instead
              of {confirming.target}.
            </p>
            <p className="text-muted">
              Your habit&apos;s goal stays {confirming.target}, so other days still need{" "}
              {confirming.target}.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost h-12" onClick={() => setConfirmId(null)}>
                Cancel
              </button>
              <button
                className="btn btn-volt"
                disabled={countAsDone.isPending}
                onClick={() => {
                  countAsDone.mutate({ id: confirming.id, date });
                  setConfirmId(null);
                }}
              >
                Count as done
              </button>
            </div>
          </div>
        )}
      </Sheet>
      <NoteSheet
        open={noting !== null}
        onClose={() => setNoteId(null)}
        title={noting ? `${noting.name} · ${dayTitle(date, today)}` : "Note"}
        initial={noting?.note ?? ""}
        pending={setNote.isPending}
        error={setNote.isError ? setNote.error.message : null}
        onSave={(text) =>
          noting && setNote.mutate({ id: noting.id, date, text }, { onSuccess: () => setNoteId(null) })
        }
      />
      <HabitEditor
        open={editor !== null}
        habit={editor === "new" ? null : editor}
        onClose={() => setEditor(null)}
      />
      <ShareSheet
        open={sharing}
        onClose={() => setSharing(false)}
        date={date}
        today={today}
        habits={relevant ?? []}
      />

      {del.toast && <UndoToast name={del.toast.name} onUndo={del.undo} />}
    </>
  );
}
