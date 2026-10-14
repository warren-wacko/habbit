"use client";

import { scoreFontPx } from "@/lib/score";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const percent = (rate: number | null) => (rate === null ? "-" : `${Math.round(rate * 100)}%`);

/** The dark score card: a progress ring for the chosen day plus streak, 7-day rate and best */
export function ScoreCard({
  done,
  total,
  streak,
  best,
  weekRate,
}: {
  done: number;
  total: number;
  streak: number;
  best: number;
  weekRate: number | null;
}) {
  const score = `${done}/${total}`;
  const progress = total ? done / total : 0;
  const perfect = total > 0 && done === total;

  return (
    <section className="hero flex items-center gap-[18px]" aria-label="Score">
      <div className="relative h-32 w-32 shrink-0">
        <svg
          width="128"
          height="128"
          viewBox="0 0 128 128"
          role="img"
          aria-label={`${done} of ${total} habits done`}
        >
          <circle
            cx="64"
            cy="64"
            r={RADIUS}
            fill="none"
            stroke="var(--hero-track)"
            strokeWidth="13"
          />
          {progress > 0 && (
            <circle
              className="ring-progress"
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              style={{ stroke: "var(--volt)" }}
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={`${(CIRCUMFERENCE * progress).toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`}
              transform="rotate(-90 64 64)"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* sized to the text, so a long score such as 10/10 stays inside the ring */}
          <span className="display num leading-none" style={{ fontSize: scoreFontPx(score) }}>
            {score}
          </span>
          <span className="caps lbl">Done</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {perfect && <span className="badge-volt">Perfect day</span>}
        <div>
          <div className="display num text-[1.625rem]">{streak}</div>
          <div className="caps lbl">Day streak</div>
        </div>
        <div className="h-px bg-hero-track" />
        <div className="flex gap-[18px]">
          <div>
            <div className="display num text-xl">{percent(weekRate)}</div>
            <div className="caps lbl">7 days</div>
          </div>
          <div>
            <div className="display num text-xl">{best}</div>
            <div className="caps lbl">Best</div>
          </div>
        </div>
      </div>
    </section>
  );
}
