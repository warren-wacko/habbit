"use client";

import { useEffect, useRef, useState } from "react";
import { amountCap, amountChips, effectiveTarget, nudge, stepFor } from "@/lib/counts";
import { useSetProgress } from "@/lib/habits";
import type { Habit } from "@/lib/types";
import { MinusIcon, PlusIcon } from "./icons";
import { Sheet } from "./Sheet";

const SAVE_DELAY = 500; // wait for a pause in tapping, then send one request

/**
 * The − / amount / + row of a counted habit. Taps show at once and are saved after a short
 * pause, so a run of taps is one request. Tap the number to type an amount instead.
 */
export function CountControl({
  habit: h,
  date,
  onFull,
}: {
  habit: Habit;
  date: string;
  onFull: () => void; // log the whole goal at once
}) {
  const setProgress = useSetProgress();
  const target = effectiveTarget(h);
  const saved = h.amountOnDate ?? (h.doneOnDate ? target : 0);
  const cap = amountCap(Math.max(h.target, target));
  const step = stepFor(target);

  const [draft, setDraft] = useState<number | null>(null);
  const [typing, setTyping] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<number | null>(null); // an amount not saved yet
  const send = useRef<(amount: number) => void>(() => {});

  // keep the latest save function where the timer and the unmount cleanup can reach it
  useEffect(() => {
    send.current = (amount: number) => {
      setProgress.mutate(
        { id: h.id, date, amount },
        {
          onSettled: () => {
            // keep showing the draft if the user has tapped again since
            if (pending.current === null) setDraft(null);
          },
        },
      );
    };
  });

  function flush() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const amount = pending.current;
    pending.current = null;
    if (amount !== null) send.current(amount);
  }

  // leaving the screen (or changing day) saves whatever is waiting
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      const amount = pending.current;
      if (amount !== null) send.current(amount);
    };
  }, []);

  function set(amount: number) {
    const next = Math.min(cap, Math.max(0, Math.round(amount)));
    setDraft(next);
    pending.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY);
  }

  function logAll() {
    // drop any tap still waiting to be saved, so it cannot overwrite the full goal
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
    setDraft(null);
    onFull();
  }

  const shown = draft ?? saved;
  const unit = h.unit ?? "";
  const unitText = unit ? ` ${unit}` : "";

  return (
    <div className="flex basis-full items-center gap-2 pb-1 pl-1.5 pr-2 pt-0.5">
      <button
        type="button"
        className="step"
        aria-label={`Take away ${step}${unitText} from ${h.name}`}
        disabled={shown <= 0}
        onClick={() => set(nudge(shown, -1, step, cap))}
      >
        {step === 1 ? <MinusIcon size={18} strokeWidth={2.2} /> : `−${step}`}
      </button>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setTyping(true)}
          aria-label={`${shown} of ${target}${unitText}. Tap to type an amount`}
          className="flex min-h-10 items-center justify-center rounded-full text-inherit"
        >
          {/* the number and its unit share a baseline; the pair is centred beside "Log all" */}
          <span className="flex items-baseline gap-1.5">
            <span className="display num text-xl">{shown}</span>
            <span className="text-sm font-semibold opacity-70">
              / {target}
              {unitText}
            </span>
          </span>
        </button>
        {!h.doneOnDate && (
          <button
            type="button"
            onClick={logAll}
            aria-label={`Log the whole goal for ${h.name}: ${target}${unitText}`}
            className="chip min-h-8 shrink-0 px-2.5 text-xs"
          >
            Log all
          </button>
        )}
      </div>
      <span className="sr-only" role="status">
        {shown} of {target}
        {unit && ` ${unit}`}
      </span>
      <button
        type="button"
        className="step"
        aria-label={`Add ${step}${unitText} to ${h.name}`}
        disabled={shown >= cap}
        onClick={() => set(nudge(shown, 1, step, cap))}
      >
        {step === 1 ? <PlusIcon size={18} strokeWidth={2.2} /> : `+${step}`}
      </button>

      <Sheet open={typing} onClose={() => setTyping(false)} title={h.name}>
        <AmountForm
          initial={shown}
          cap={cap}
          target={target}
          unit={unit}
          step={step}
          onSave={(amount) => {
            set(amount);
            flush();
            setTyping(false);
          }}
        />
      </Sheet>
    </div>
  );
}

function AmountForm({
  initial,
  cap,
  target,
  unit,
  step,
  onSave,
}: {
  initial: number;
  cap: number;
  target: number;
  unit: string;
  step: number;
  onSave: (amount: number) => void;
}) {
  const [value, setValue] = useState(String(initial));
  const n = Number(value);
  const valid = value.trim() !== "" && Number.isInteger(n) && n >= 0 && n <= cap;
  const add = (by: number) => setValue(String(Math.min(cap, (Number.isFinite(n) ? n : 0) + by)));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave(n);
      }}
    >
      <div className="field">
        <label htmlFor="amount">
          How many{unit ? ` ${unit}` : ""} today? Goal: {target}
        </label>
        <input
          id="amount"
          type="number"
          inputMode="numeric"
          min={0}
          max={cap}
          step={1}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input"
        />
        {!valid && value.trim() !== "" && (
          <p role="alert" className="text-sm text-danger">
            Enter a whole number from 0 to {cap}.
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {amountChips(step).map((by) => (
          <button key={by} type="button" className="chip" onClick={() => add(by)}>
            +{by}
          </button>
        ))}
        <button type="button" className="chip" onClick={() => setValue(String(Math.min(cap, target)))}>
          Full goal ({target})
        </button>
      </div>
      <button type="submit" className="btn btn-volt" disabled={!valid}>
        Save
      </button>
    </form>
  );
}
