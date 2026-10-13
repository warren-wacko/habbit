"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestNewHabit } from "@/lib/newHabitSignal";
import { clampStep, TOUR_SLIDES, type TourSlide } from "@/lib/tour";
import { useUpdateProfile } from "@/lib/useMe";
import {
  CalendarDaysIcon,
  ChartIcon,
  CheckIcon,
  CircleCheckIcon,
  EllipsisIcon,
  NoteIcon,
  ShareIcon,
  TargetIcon,
  UserIcon,
} from "./icons";
import { useModalDialog } from "./Sheet";
import { TourSample } from "./TourSample";

const SLIDE_ICON: Record<TourSlide["id"], React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  tick: CircleCheckIcon,
  habits: TargetIcon,
  page: NoteIcon,
  days: CalendarDaysIcon,
  menu: EllipsisIcon,
  share: ShareIcon,
  progress: ChartIcon,
  you: UserIcon,
};

/**
 * The first-time tour: a few short screens with Skip always in reach. Finishing, skipping or
 * pressing Escape all count as "seen". `markDone` is false when someone replays it later.
 */
export function Tour({
  open,
  onClose,
  markDone,
}: {
  open: boolean;
  onClose: () => void;
  markDone: boolean;
}) {
  const ref = useModalDialog(open);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label="Quick tour"
      className="fullscreen"
    >
      {open && <TourBody close={() => ref.current?.close()} markDone={markDone} />}
    </dialog>
  );
}

function TourBody({ close, markDone }: { close: () => void; markDone: boolean }) {
  const router = useRouter();
  const update = useUpdateProfile();
  const [step, setStep] = useState(0);
  const last = step === TOUR_SLIDES.length - 1;
  const slide = TOUR_SLIDES[step];
  const Icon = SLIDE_ICON[slide.id];

  // however the tour ends, it is marked as seen once; closing the dialog also runs onClose
  function finish(addHabit = false) {
    if (markDone) update.mutate({ onboarded: true });
    close();
    if (addHabit) {
      router.push("/");
      requestNewHabit();
    }
  }

  return (
    <div className="flex min-h-full flex-col gap-6 px-6 pb-8 pt-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5" aria-hidden="true">
          {TOUR_SLIDES.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-ink" : "w-1.5 bg-strong"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => finish()}
          className="inline-flex h-11 items-center px-2 font-bold text-muted hover:text-ink"
        >
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-5" aria-live="polite">
        {!slide.sample && (
          <span
            aria-hidden="true"
            className="grid size-20 place-items-center rounded-3xl bg-volt text-on-volt"
          >
            <Icon size={38} strokeWidth={1.8} />
          </span>
        )}
        <span className="caps text-xs text-muted">
          {step + 1} of {TOUR_SLIDES.length}
        </span>
        <h2 className={`display text-[1.875rem] ${slide.sample ? "-mt-2" : "-mt-3"}`}>{slide.title}</h2>
        <p className="text-[1.0625rem] text-muted">{slide.body}</p>
        {slide.sample && <TourSample kind={slide.sample} />}
        <ul className="flex flex-col gap-3">
          {slide.tips.map((tip) => (
            <li key={tip} className="flex items-start gap-3 text-[0.9375rem] font-semibold">
              <span
                aria-hidden="true"
                className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-volt text-on-volt"
              >
                <CheckIcon size={12} strokeWidth={3} />
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {last ? (
        <div className="flex flex-col gap-2">
          <button type="button" className="btn btn-volt" autoFocus onClick={() => finish(true)}>
            Add my first habit
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn-ghost h-12"
              onClick={() => setStep((s) => clampStep(s - 1, TOUR_SLIDES.length))}
            >
              Back
            </button>
            <button type="button" className="btn-ghost h-12" onClick={() => finish()}>
              Not now
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[auto_1fr] gap-2">
          <button
            type="button"
            className="btn-ghost h-12 px-5"
            disabled={step === 0}
            onClick={() => setStep((s) => clampStep(s - 1, TOUR_SLIDES.length))}
          >
            Back
          </button>
          <button
            type="button"
            className="btn btn-volt"
            autoFocus
            onClick={() => setStep((s) => clampStep(s + 1, TOUR_SLIDES.length))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
