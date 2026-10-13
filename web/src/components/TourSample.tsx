import { SHARE_FORMATS, SHARE_LAYOUTS, SHARE_THEMES } from "@/lib/shareCard";
import type { TourSlide } from "@/lib/tour";
import { HabitTile } from "./habitIcons";
import { CalendarIcon, MinusIcon, MoreIcon, NoteIcon, PlusIcon, ShareIcon } from "./icons";

/** What each numbered marker means, shown as a list under the pretend card */
const NOTES = {
  goal: [
    "Tap the circle to finish the habit",
    "Tap the amount to type your own",
    "Log all finishes the whole goal in one tap",
    "The ⋯ button holds skip, notes and edit",
  ],
  page: [
    "Tap a habit's name to open its page",
    "A purple tag marks a day with a note. Tap any day to read, add or edit one",
    "Your notes are listed on the page, newest first",
  ],
  share: [
    "Tap the share button on Today",
    "Your day becomes a picture",
    "Pick a layout and a colour theme",
    "Choose a size, add a photo or your name, then save or share",
  ],
} as const;

/** `at` is where the marker sits on its parent, as Tailwind position classes */
function Marker({ n, at = "-left-1 -top-2.5" }: { n: number; at?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute ${at} z-10 grid size-5 place-items-center rounded-full bg-volt text-[0.6875rem] font-extrabold leading-none text-on-volt shadow-[0_0_0_2px_var(--surface)]`}
    >
      {n}
    </span>
  );
}

/**
 * A pretend card for the tour, drawn with the real styles and marked with numbers. It does
 * nothing when tapped. The list under it says the same in words, so the card itself is
 * hidden from screen readers.
 */
export function TourSample({ kind }: { kind: NonNullable<TourSlide["sample"]> }) {
  return (
    <div className="flex flex-col gap-3">
      <div inert aria-hidden="true" className="pt-2">
        {kind === "goal" && <GoalSample />}
        {kind === "page" && <PageSample />}
        {kind === "share" && <ShareSample />}
      </div>
      <ol className="flex flex-col gap-2">
        {NOTES[kind].map((note, i) => (
          <li key={note} className="flex items-start gap-3 text-[0.9375rem] font-semibold">
            <span
              aria-hidden="true"
              className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-volt text-[0.6875rem] font-extrabold leading-none text-on-volt"
            >
              {i + 1}
            </span>
            {note}
          </li>
        ))}
      </ol>
    </div>
  );
}

function GoalSample() {
  return (
    <ul>
      <li className="habit" data-done="false" style={{ "--hc": "var(--h-sky)" } as React.CSSProperties}>
        <span className="relative grid size-11 shrink-0 place-items-center">
          <Marker n={1} />
          <span className="check-box" />
        </span>
        <HabitTile color="sky" icon="meditate" name="Meditate" />
        <span className="flex min-w-0 flex-1 flex-col gap-[5px]">
          <span className="text-[0.9375rem] font-bold leading-tight">Meditate</span>
          <span className="meta text-xs font-semibold">Every day</span>
        </span>
        <span className="more relative">
          <Marker n={4} />
          <MoreIcon />
        </span>

        <div className="flex basis-full items-center gap-2 pb-1 pl-1.5 pr-2 pt-0.5">
          <span className="step">
            <MinusIcon size={18} strokeWidth={2.2} />
          </span>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <span className="relative flex min-h-10 items-center justify-center">
              <Marker n={2} at="-left-1 -bottom-2.5" />
              <span className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="display num text-xl">10</span>
                <span className="text-sm font-semibold opacity-70">/ 30 min</span>
              </span>
            </span>
            <span className="chip relative min-h-8 shrink-0 px-2.5 text-xs">
              <Marker n={3} />
              Log all
            </span>
          </div>
          <span className="step">
            <PlusIcon size={18} strokeWidth={2.2} />
          </span>
        </div>
      </li>
    </ul>
  );
}

// one week of the habit page's calendar: [day, look]
const WEEK: [number, string][] = [
  [8, "hit"],
  [9, "hit"],
  [10, "miss"],
  [11, "hit has-note"],
  [12, "hit"],
  [13, "skip"],
  [14, "today"],
];

function PageSample() {
  return (
    <div className="flex flex-col gap-3">
      <ul>
        <li className="habit" data-done="false" style={{ "--hc": "var(--h-sky)" } as React.CSSProperties}>
          <span className="check-box ml-1.5" />
          <HabitTile color="sky" icon="meditate" name="Meditate" />
          <span className="relative flex min-w-0 flex-1 flex-col gap-[5px]">
            <span className="relative w-fit text-[0.9375rem] font-bold leading-tight underline decoration-2 underline-offset-4">
              <Marker n={1} at="-right-6 -top-2" />
              Meditate
            </span>
            <span className="meta text-xs font-semibold">Every day</span>
          </span>
          <span className="more">
            <MoreIcon />
          </span>
        </li>
      </ul>
      <section className="card">
        <div className="cal text-center text-[0.6875rem] font-bold text-muted">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <b key={i}>{d}</b>
          ))}
        </div>
        <div className="cal mt-1">
          {WEEK.map(([day, look]) => (
            <span key={day} className={look}>
              {day}
              {look.includes("has-note") && (
                <span className="note-mark">
                  <NoteIcon size={9} strokeWidth={2.6} />
                  <Marker n={2} at="-top-1 left-full ml-0.5" />
                </span>
              )}
            </span>
          ))}
        </div>
        <div className="relative rounded-xl border border-line px-3 py-2.5">
          <Marker n={3} />
          <div className="caps text-[0.6875rem] text-muted">Wed 11</div>
          <p className="text-sm font-semibold">Felt calm after a busy day.</p>
        </div>
      </section>
    </div>
  );
}

function ShareSample() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="display text-[1.75rem]">Today</h3>
        <div className="flex gap-2">
          <span className="icon-btn relative">
            <Marker n={1} />
            <ShareIcon />
          </span>
          <span className="icon-btn">
            <CalendarIcon />
          </span>
        </div>
      </div>
      <div className="flex items-start gap-3.5 rounded-2xl border border-line bg-surface p-3">
        <div className="relative flex aspect-[9/16] w-24 shrink-0 flex-col justify-end gap-1 rounded-xl bg-volt p-2.5 text-on-volt">
          <Marker n={2} />
          <span className="caps text-[0.5625rem]">Oct 14</span>
          <span className="display text-base leading-none">Perfect day.</span>
          <span className="text-[0.625rem] font-bold">3 of 3 done</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="relative">
            <Marker n={3} at="-right-1 -top-2.5" />
            <div className="legend mb-1.5 text-[0.6875rem]">Layout</div>
            <div className="grid grid-cols-2 gap-1.5">
              {SHARE_LAYOUTS.slice(0, 2).map((l, i) => (
                <span key={l.key} className="opt grid place-items-center !h-8 text-xs" aria-pressed={i === 0}>
                  {l.label}
                </span>
              ))}
            </div>
            <div className="mt-2.5 flex gap-2">
              {SHARE_THEMES.map((t, i) => (
                <span key={t.key} className="round-pick" aria-pressed={i === 1} style={{ background: t.swatch }} />
              ))}
            </div>
          </div>
          <div className="seg relative">
            <Marker n={4} />
            {(Object.keys(SHARE_FORMATS) as (keyof typeof SHARE_FORMATS)[]).map((k, i) => (
              <span key={k} aria-pressed={i === 0} className="grid h-8 place-items-center text-xs font-bold">
                {SHARE_FORMATS[k].label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
