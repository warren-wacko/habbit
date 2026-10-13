"use client";

import { useState } from "react";
import { EVERY_DAY } from "@/lib/dates";
import { GOAL_PRESETS, MAX_TARGET, goalChange } from "@/lib/counts";
import { useAddHabit, useUpdateHabit } from "@/lib/habits";
import { QUICK_START } from "@/lib/quickStart";
import { TIME_LABEL, TIME_OF_DAY, type TimeOfDay } from "@/lib/timeOfDay";
import { useToday } from "@/lib/useToday";
import {
  HABIT_COLORS,
  HABIT_ICON_KEYS,
  type Habit,
  type HabitStyle,
} from "@/lib/types";
import { HABIT_ICONS, HabitTile } from "./habitIcons";
import { CheckIcon } from "./icons";
import { useModalDialog } from "./Sheet";

const WEEKDAYS = 0b0011111;
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const repeatMode = (mask: number) =>
  mask === EVERY_DAY ? "every" : mask === WEEKDAYS ? "weekdays" : "custom";

/**
 * The full-screen editor for a new habit (`habit` is null) or an existing one.
 * Its form only exists while it is open, so every opening starts from the
 * habit's saved values.
 */
export function HabitEditor({
  open,
  habit,
  onClose,
}: {
  open: boolean;
  habit: Habit | null;
  onClose: () => void;
}) {
  const ref = useModalDialog(open);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={habit ? "Edit habit" : "New habit"}
      className="fullscreen"
    >
      {open && <EditorForm habit={habit} close={() => ref.current?.close()} />}
    </dialog>
  );
}

function EditorForm({ habit, close }: { habit: Habit | null; close: () => void }) {
  const add = useAddHabit();
  const update = useUpdateHabit();
  const today = useToday();

  const [name, setName] = useState(habit?.name ?? "");
  const [style, setStyle] = useState<HabitStyle>({
    color: habit?.color ?? "volt",
    icon: habit?.icon ?? null,
    scheduleDays: habit?.scheduleDays ?? EVERY_DAY,
  });
  const [custom, setCustom] = useState(repeatMode(style.scheduleDays) === "custom");
  const [when, setWhen] = useState<TimeOfDay>(habit?.timeOfDay ?? "anytime");
  // the daily goal: 1 is a plain tick, more is a count with an optional unit
  const [goal, setGoal] = useState(String(habit?.target ?? 1));
  const [unit, setUnit] = useState(habit?.unit ?? "");
  const goalNumber = Number(goal);
  const goalValid = Number.isInteger(goalNumber) && goalNumber >= 1 && goalNumber <= MAX_TARGET;
  const cleanUnit = goalNumber > 1 ? unit.trim() : "";

  const mode = custom ? "custom" : repeatMode(style.scheduleDays);
  const pending = add.isPending || update.isPending;
  const error = add.error ?? update.error;
  const trimmed = name.trim();

  function save() {
    if (!trimmed || !goalValid || pending) return;
    if (!habit) {
      add.mutate(
        { name: trimmed, ...style, target: goalNumber, unit: cleanUnit || null, timeOfDay: when },
        { onSuccess: close },
      );
      return;
    }
    // send only what changed
    const changes: {
      name?: string;
      target?: number;
      unit?: string | null;
      timeOfDay?: TimeOfDay;
    } & Partial<HabitStyle> = {};
    if (trimmed !== habit.name) changes.name = trimmed;
    if (style.color !== habit.color) changes.color = style.color;
    if (style.icon !== habit.icon) changes.icon = style.icon;
    if (style.scheduleDays !== habit.scheduleDays) changes.scheduleDays = style.scheduleDays;
    if (when !== habit.timeOfDay) changes.timeOfDay = when;
    if (goalNumber !== habit.target) changes.target = goalNumber;
    if ((cleanUnit || null) !== (habit.unit ?? null)) changes.unit = cleanUnit || null;
    if (Object.keys(changes).length === 0) return close();
    // the date lets the server re-check today when the goal is lowered
    update.mutate(
      { id: habit.id, ...changes, ...(changes.target !== undefined ? { today } : {}) },
      { onSuccess: close },
    );
  }

  function toggleDay(i: number) {
    const next = style.scheduleDays ^ (1 << i);
    if (next === 0) return; // a habit needs at least one day
    setStyle({ ...style, scheduleDays: next });
    setCustom(true);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex min-h-full flex-col gap-5 px-5 pb-8 pt-3.5"
    >
      <div className="flex items-center justify-between">
        <button type="button" onClick={close} className="h-11 px-1 font-semibold">
          Cancel
        </button>
        <span className="caps text-xs text-muted">{habit ? "Edit habit" : "New habit"}</span>
        <button type="submit" disabled={!trimmed || !goalValid || pending} className="btn btn-sm">
          {pending ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <HabitTile color={style.color} icon={style.icon} name={trimmed || "?"} size={56} />
        <div className="field flex-1">
          <label htmlFor="habit-name">Name</label>
          <input
            id="habit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoComplete="off"
            placeholder="e.g. Drink water"
            className="h-12 w-full border-0 border-b-2 border-ink bg-transparent p-0 text-xl font-bold placeholder:font-semibold placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
          />
        </div>
      </div>

      {!habit && (
        <div className="flex flex-wrap gap-2">
          <span className="caps w-full text-xs text-muted">Quick start</span>
          {QUICK_START.map((q) => (
            <button
              key={q.name}
              type="button"
              className="chip"
              onClick={() => {
                setName(q.name);
                setStyle((s) => ({ ...s, icon: q.icon, color: q.color }));
              }}
            >
              {q.name}
            </button>
          ))}
        </div>
      )}

      <fieldset>
        <legend className="legend mb-2.5">Colour</legend>
        <div className="grid grid-cols-6 gap-2.5">
          {HABIT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={style.color === c}
              onClick={() => setStyle({ ...style, color: c })}
              className="swatch"
              style={{ background: `var(--h-${c})` }}
            >
              <CheckIcon size={18} strokeWidth={2.6} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="legend mb-2.5">Icon</legend>
        <div
          className="grid grid-cols-6 gap-2"
          style={{ "--hc": `var(--h-${style.color})` } as React.CSSProperties}
        >
          {HABIT_ICON_KEYS.map((key) => {
            const { Icon, label } = HABIT_ICONS[key];
            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-pressed={style.icon === key}
                // tapping the chosen icon again clears it
                onClick={() => setStyle({ ...style, icon: style.icon === key ? null : key })}
                className="icon-pick"
              >
                <Icon size={22} strokeWidth={1.8} />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="legend mb-2.5">Daily goal</legend>
        <div className="flex gap-2.5">
          <div className="field w-28 shrink-0">
            <label htmlFor="habit-goal">Times a day</label>
            <input
              id="habit-goal"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_TARGET}
              step={1}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              aria-invalid={!goalValid}
              className="input"
            />
          </div>
          <div className="field min-w-0 flex-1">
            <label htmlFor="habit-unit">Unit (optional)</label>
            <input
              id="habit-unit"
              value={goalNumber > 1 ? unit : ""}
              onChange={(e) => setUnit(e.target.value)}
              disabled={!(goalNumber > 1)}
              maxLength={20}
              autoComplete="off"
              placeholder="glasses, pages, minutes"
              className="input"
            />
          </div>
        </div>
        {!goalValid && (
          <p role="alert" className="text-sm text-danger">
            Enter a whole number from 1 to {MAX_TARGET.toLocaleString()}.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {GOAL_PRESETS.map((g) => (
            <button
              key={g.name}
              type="button"
              className="chip"
              aria-pressed={goalNumber === g.target && unit.trim() === g.unit}
              onClick={() => {
                setGoal(String(g.target));
                setUnit(g.unit);
                if (!habit && !trimmed) {
                  setName(g.name);
                  setStyle((s) => ({ ...s, icon: g.icon, color: g.color }));
                }
              }}
            >
              {g.target} {g.unit}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          {habit && goalValid && goalChange(habit.target, goalNumber) === "lower"
            ? "Lowering the goal applies from today. If today already has enough, it is finished now. Past days keep their goal."
            : habit && goalValid && goalChange(habit.target, goalNumber) === "raise"
              ? "Raising the goal applies from today. Days you have already finished keep their goal."
              : goalNumber > 1
                ? "Reaching the goal finishes the day. Days you have already finished keep the goal they were reached under."
                : "1 is a simple tick. Set a higher number to count, like 8 glasses."}
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="legend mb-2.5">Time of day</legend>
        <div className="seg" role="group" aria-label="Time of day">
          {TIME_OF_DAY.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={when === t}
              onClick={() => setWhen(t)}
            >
              {TIME_LABEL[t]}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Today groups your habits under Morning, Afternoon and Evening. Anytime stays in one list.
        </p>
      </fieldset>

      <fieldset className="flex flex-col gap-2.5">
        <legend className="legend mb-2.5">Repeat</legend>
        <div className="seg" role="group" aria-label="Repeat">
          {(
            [
              ["every", "Every day"],
              ["weekdays", "Weekdays"],
              ["custom", "Custom"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={mode === key}
              onClick={() => {
                if (key === "custom") return setCustom(true);
                setCustom(false);
                setStyle({ ...style, scheduleDays: key === "every" ? EVERY_DAY : WEEKDAYS });
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="dow">
          {DAY_LETTERS.map((letter, i) => (
            <button
              key={i}
              type="button"
              aria-label={DAY_NAMES[i]}
              aria-pressed={((style.scheduleDays >> i) & 1) === 1}
              onClick={() => toggleDay(i)}
            >
              {letter}
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="alert">
          {error.message}
        </p>
      )}
    </form>
  );
}
