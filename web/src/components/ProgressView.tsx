"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { addDays, formatDate, toISO, todayLocal, weekOf } from "@/lib/dates";
import { habitDetailStats, shortDate } from "@/lib/habitStats";
import {
  dailyBars,
  heatLevel,
  monthLabels,
  monthlyBars,
  periodDelta,
  windowTotals,
  type Bar,
} from "@/lib/stats";
import { HISTORY_DAYS } from "@/lib/habits";
import { useOverall } from "@/lib/useOverall";
import { HabitTile } from "./habitIcons";
import { ArrowDownIcon, ArrowUpIcon } from "./icons";

type Period = "week" | "month" | "year";
const PERIODS: { key: Period; label: string; days: number; versus: string }[] = [
  { key: "week", label: "Week", days: 7, versus: "last week" },
  { key: "month", label: "Month", days: 30, versus: "last month" },
  { key: "year", label: "Year", days: HISTORY_DAYS, versus: "" },
];

const WEEKS = 12;

export function ProgressView() {
  const today = todayLocal();
  const [period, setPeriod] = useState<Period>("week");
  const { history, overall } = useOverall();

  const habits = useMemo(
    () =>
      (history.data?.habits ?? []).map((h) => ({
        ...h,
        created: toISO(new Date(h.createdAt)),
        dates: new Set(h.dates),
        skips: new Set(h.skips ?? []),
      })),
    [history.data],
  );
  const from = addDays(today, -(HISTORY_DAYS - 1));

  const stats = useMemo(
    () => habits.map((h) => ({ habit: h, ...habitDetailStats(h, today, from) })),
    [habits, today, from],
  );

  if (history.isPending) {
    return (
      <>
        <h1 className="display text-[2.125rem]">Progress</h1>
        <div className="skeleton h-72" aria-busy="true" aria-label="Loading progress" />
        <div className="skeleton h-40" />
      </>
    );
  }
  if (history.isError) {
    return (
      <>
        <h1 className="display text-[2.125rem]">Progress</h1>
        <p role="alert" className="alert">
          {history.error.message}
        </p>
      </>
    );
  }
  if (!overall || habits.length === 0) {
    return (
      <>
        <h1 className="display text-[2.125rem]">Progress</h1>
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-strong px-5 py-10 text-center">
          <span className="caps text-muted">Nothing to chart yet</span>
          <p className="display text-2xl">Log a few days</p>
          <p className="max-w-64 text-sm text-muted">
            Your completion rate and streaks show up here once you have habits and a day or two of ticks.
          </p>
          <Link href="/" className="btn btn-volt mt-1 no-underline">
            Go to Today
          </Link>
        </div>
      </>
    );
  }

  const cfg = PERIODS.find((p) => p.key === period)!;
  const byDay = overall.byDay;
  const totals = windowTotals(byDay, today, cfg.days);
  const delta = period === "year" ? null : periodDelta(byDay, today, cfg.days).changePoints;
  const bars: Bar[] =
    period === "year" ? monthlyBars(byDay, today, 12) : dailyBars(byDay, today, cfg.days);
  const rangeLabel =
    period === "week"
      ? `${shortDate(addDays(today, -6))}-${Number(today.slice(8, 10))}`
      : period === "month"
        ? "Last 30 days"
        : "Last 12 months";
  const rate = totals.rate === null ? "-" : `${Math.round(totals.rate * 100)}%`;

  // heatmap: 12 week-columns ending with this week, rows Monday to Sunday
  const thisMonday = weekOf(today)[0];
  const weekStarts = Array.from({ length: WEEKS }, (_, c) => addDays(thisMonday, -7 * (WEEKS - 1 - c)));
  const firstCreated = habits.map((h) => h.created).sort()[0];
  const labels = monthLabels(weekStarts);

  // habits by 30-day completion
  const ranked = [...stats].sort((a, b) => (b.rate30 ?? -1) - (a.rate30 ?? -1));

  return (
    <>
      <h1 className="display text-[2.125rem]">Progress</h1>

      <div className="seg" role="group" aria-label="Period">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            aria-pressed={period === p.key}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <section className="card gap-3.5" aria-label="Completion">
        <div className="flex items-end justify-between gap-2.5">
          <div>
            <div className="caps text-xs text-muted">Completion · {rangeLabel}</div>
            <div className="display num text-[3.75rem] leading-[0.9]">{rate}</div>
          </div>
          {delta !== null && (
            <span className="delta">
              {delta >= 0 ? <ArrowUpIcon size={14} strokeWidth={2.4} /> : <ArrowDownIcon size={14} strokeWidth={2.4} />}
              {Math.abs(delta)} {Math.abs(delta) === 1 ? "pt" : "pts"} vs {cfg.versus}
            </span>
          )}
        </div>

        <div
          className="chart"
          role="img"
          aria-label={`Completion for each ${period === "year" ? "month" : "day"}`}
          style={{
            gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))`,
            gap: period === "week" ? 10 : period === "month" ? 3 : 8,
          }}
        >
          {bars.map((b) => (
            <span
              key={b.key}
              className={b.rate === null ? "empty" : b.perfect ? "full" : ""}
              style={{ height: `${b.rate === null ? 0 : Math.round(b.rate * 100)}%` }}
            />
          ))}
        </div>
        <div
          className="-mt-1.5 grid text-center text-xs text-muted"
          style={{ gridTemplateColumns: `repeat(${bars.length}, minmax(0, 1fr))` }}
          aria-hidden="true"
        >
          {period === "week" &&
            bars.map((b, i) => (
              <span key={b.key} className={i === bars.length - 1 ? "font-bold text-ink" : ""}>
                {formatDate(b.key, { weekday: "narrow" })}
              </span>
            ))}
          {period === "year" &&
            bars.map((b, i) => (
              <span key={b.key} className={i === bars.length - 1 ? "font-bold text-ink" : ""}>
                {formatDate(`${b.key}-01`, { month: "narrow" })}
              </span>
            ))}
          {period === "month" && (
            <>
              <span className="col-span-10 text-left">{shortDate(addDays(today, -29))}</span>
              <span className="col-span-10" />
              <span className="col-span-10 text-right font-bold text-ink">Today</span>
            </>
          )}
        </div>
        <div className="flex gap-3.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-[3px] bg-volt" />
            {period === "year" ? "Every habit, every day" : "Perfect day"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="size-2.5 rounded-[3px] bg-uv" />
            Partial
          </span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5" aria-label="Totals">
        <Stat label="Done" value={totals.done} of={`of ${totals.scheduled}`} />
        <Stat label="Perfect days" value={totals.perfectDays} of={`of ${totals.activeDays}`} volt />
        <Stat label="Day streak" value={overall.current} of="days" />
        <Stat label="Best streak" value={overall.best} of="days" />
      </section>

      <section className="card" aria-labelledby="consistency-heading">
        <div className="flex items-center justify-between">
          <h2 id="consistency-heading" className="display text-lg">
            Consistency
          </h2>
          <span className="text-xs text-muted">Last 12 weeks</span>
        </div>
        <div className="caps grid grid-cols-12 text-muted" aria-hidden="true">
          {labels.map((l, i) => (
            <span key={i} className="overflow-visible whitespace-nowrap text-[0.625rem]">
              {l}
            </span>
          ))}
        </div>
        <div className="heat" role="img" aria-label="Completion heatmap for the last 12 weeks">
          {weekStarts.flatMap((monday) =>
            Array.from({ length: 7 }, (_, r) => {
              const d = addDays(monday, r);
              if (d > today) return <span key={d} className="future" />;
              if (d < firstCreated) return <span key={d} className="before" />;
              const t = byDay.get(d);
              const title = t && t.scheduled ? `${formatDate(d, { weekday: "short", day: "numeric", month: "short" })}: ${t.done} of ${t.scheduled} done` : undefined;
              return <span key={d} className={`h${heatLevel(t)}`} title={title} />;
            }),
          )}
        </div>
        <div className="flex items-center justify-end gap-1 text-[0.6875rem] text-muted" aria-hidden="true">
          0%
          {[0, 1, 2, 3].map((l) => (
            <i key={l} className={`size-3 rounded-[3px] h${l}`} style={{ background: `var(--heat-${l})` }} />
          ))}
          100%
        </div>
      </section>

      <section className="card gap-0 px-4 pb-2 pt-4" aria-labelledby="by-habit-heading">
        <div className="flex items-center justify-between px-1 pb-1.5">
          <h2 id="by-habit-heading" className="display text-lg">
            By habit
          </h2>
          <span className="text-xs text-muted">30-day completion</span>
        </div>
        <div>
          {ranked.map((s, i) => {
            const pct = s.rate30 === null ? null : Math.round(s.rate30 * 100);
            return (
              <Link key={s.habit.id} href={`/habits/${s.habit.id}`} className="rank">
                <span className="display w-[1.125rem] text-sm text-muted">{i + 1}</span>
                <HabitTile color={s.habit.color} icon={s.habit.icon} name={s.habit.name} size={34} />
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex justify-between gap-2">
                    <span className="truncate text-sm font-bold">{s.habit.name}</span>
                    <span className="display num text-sm">{pct === null ? "-" : `${pct}%`}</span>
                  </span>
                  <span className="meter">
                    <span style={{ width: `${pct ?? 0}%` }} />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, of, volt }: { label: string; value: number; of: string; volt?: boolean }) {
  return (
    <div className={`stat ${volt ? "volt" : ""}`}>
      <span className="caps opacity-70">{label}</span>
      <span>
        <span className="display num text-[2.125rem]">{value}</span>{" "}
        <span className="text-[0.8125rem] font-semibold opacity-70">{of}</span>
      </span>
    </div>
  );
}
