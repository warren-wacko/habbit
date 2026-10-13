"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { effectiveTarget, isCounted } from "@/lib/counts";
import { addDays, formatDate } from "@/lib/dates";
import { initialOf } from "@/lib/profile";
import { heatGridFor, lastSevenDays } from "@/lib/shareGrid";
import {
  PERFECT_MESSAGES,
  readStoredMessage,
  storeMessage,
  type PerfectMessageKey,
} from "@/lib/shareMessage";
import {
  drawShareCard,
  SHARE_FORMATS,
  SHARE_LAYOUTS,
  SHARE_THEMES,
  type ShareData,
  type ShareFormat,
  type ShareLayout,
  type ShareTheme,
} from "@/lib/shareCard";
import {
  canvasToBlob,
  downloadBlob,
  loadPhoto,
  loadShareFonts,
  readShareFonts,
  resolveHabitColor,
  shareBlob,
  supportsFileShare,
} from "@/lib/shareExport";
import { dailyBars, heatLevel, windowTotals } from "@/lib/stats";
import type { Habit } from "@/lib/types";
import { useMe } from "@/lib/useMe";
import { useOverall } from "@/lib/useOverall";
import { Sheet } from "./Sheet";

type Props = {
  open: boolean;
  onClose: () => void;
  date: string;
  today: string;
  habits: Habit[]; // the habits that count on `date`
};

export function ShareSheet({ open, onClose, date, today, habits }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Share your day">
      <ShareBody date={date} today={today} habits={habits} />
    </Sheet>
  );
}

// Lives inside the sheet, so its choices reset each time the sheet opens
function ShareBody({ date, today, habits }: Omit<Props, "open" | "onClose">) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layout, setLayout] = useState<ShareLayout>("stats");
  const [theme, setTheme] = useState<ShareTheme>("ink");
  const [format, setFormat] = useState<ShareFormat>("story");
  const [photo, setPhoto] = useState<ImageBitmap | null>(null);
  // the name and avatar are only on the picture when the user turns them on
  const [showName, setShowName] = useState(false);
  // the Poster's headline on a perfect day; the last choice is remembered on this device
  const [message, setMessage] = useState<PerfectMessageKey>(readStoredMessage);
  const [error, setError] = useState<string | null>(null);
  const { overall } = useOverall();
  const me = useMe();
  const nickname = me.data?.nickname?.trim() || null;
  const perfectDay = habits.length > 0 && habits.every((h) => h.doneOnDate);

  const data: ShareData = useMemo(() => {
    const byDay = overall?.byDay;
    const heat = Array.from({ length: 42 }, (_, i) => {
      const d = addDays(date, -(41 - i));
      return d > today || !byDay ? null : heatLevel(byDay.get(d));
    });
    const heatGrid = heatGridFor(date, today, byDay);
    return {
      dateLabel: formatDate(date, { weekday: "short", day: "numeric", month: "short" }).replace(",", ""),
      done: habits.filter((h) => h.doneOnDate).length,
      total: habits.length,
      streak: date === today && overall ? overall.current : null,
      best: overall?.best ?? 0,
      weekRate: byDay ? windowTotals(byDay, date, 7).rate : null,
      bars: byDay ? dailyBars(byDay, date, 7) : [],
      dayLetters: lastSevenDays(date).map((d) => formatDate(d, { weekday: "narrow" })),
      heat,
      heatGrid,
      habits: habits.map((h) => ({
        name: h.name,
        color: "",
        done: h.doneOnDate,
        // a habit with a goal shows how much was done: "5/8 glasses"
        detail: isCounted(h)
          ? `${h.amountOnDate ?? (h.doneOnDate ? effectiveTarget(h) : 0)}/${effectiveTarget(h)}${
              h.unit ? ` ${h.unit}` : ""
            }`
          : undefined,
      })),
      profile: null,
    };
  }, [date, today, habits, overall]);

  // redraw whenever something shown on the picture changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const fonts = readShareFonts();
      await loadShareFonts(fonts);
      if (cancelled) return;
      const coloured: ShareData = {
        ...data,
        habits: data.habits.map((h, i) => ({ ...h, color: resolveHabitColor(habits[i].color) })),
        // only the nickname is ever drawn, never the email
        profile:
          showName && me.data && nickname
            ? {
                name: nickname,
                initial: initialOf({ email: me.data.email, nickname }),
                color: resolveHabitColor(me.data.avatarColor),
              }
            : null,
      };
      drawShareCard(canvas, coloured, { layout, theme, format, photo, message }, fonts);
    })();
    return () => {
      cancelled = true;
    };
  }, [data, layout, theme, format, photo, habits, showName, me.data, nickname, message]);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    try {
      const bitmap = await loadPhoto(file);
      setPhoto((old) => {
        old?.close();
        return bitmap;
      });
    } catch {
      setError("That file couldn't be read as a picture. Try a JPG or PNG.");
    }
  }

  async function exportPicture(
    action: (blob: Blob, filename: string) => void | Promise<void>,
    failure: string,
  ) {
    setError(null);
    const blob = canvasRef.current ? await canvasToBlob(canvasRef.current) : null;
    if (!blob) {
      setError("Couldn't create the picture. Try again.");
      return;
    }
    try {
      await action(blob, `habbit-${date}.png`);
    } catch {
      setError(failure);
    }
  }

  return (
    <>
      <div className="flex items-start gap-3.5">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Preview of your picture"
          className="h-auto w-[11.5rem] shrink-0 rounded-2xl border border-line"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3.5">
          <fieldset>
            <legend className="legend mb-2 text-[0.6875rem]">Layout</legend>
            <div className="grid grid-cols-2 gap-2">
              {SHARE_LAYOUTS.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  className="opt"
                  aria-pressed={layout === l.key}
                  onClick={() => setLayout(l.key)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </fieldset>
          {layout === "poster" && perfectDay && (
            <fieldset>
              <legend className="legend mb-2 text-[0.6875rem]">Message</legend>
              <div className="grid grid-cols-2 gap-2">
                {PERFECT_MESSAGES.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    className="opt"
                    aria-pressed={message === m.key}
                    onClick={() => {
                      setMessage(m.key);
                      storeMessage(m.key);
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset>
            <legend className="legend mb-2 text-[0.6875rem]">Theme</legend>
            <div className="flex gap-2">
              {SHARE_THEMES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  aria-label={t.label}
                  aria-pressed={theme === t.key}
                  onClick={() => setTheme(t.key)}
                  className="round-pick"
                  style={{ background: t.swatch }}
                />
              ))}
            </div>
            {photo && (
              <p className="mt-1.5 text-xs text-muted">With a photo, text is always light.</p>
            )}
          </fieldset>
          <fieldset>
            <legend className="legend mb-2 text-[0.6875rem]">Size</legend>
            <div className="seg" role="group" aria-label="Size">
              {(Object.keys(SHARE_FORMATS) as ShareFormat[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={format === k}
                  onClick={() => setFormat(k)}
                  className="!h-9"
                >
                  {SHARE_FORMATS[k].label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              className="opt"
              aria-pressed={showName && !!nickname}
              disabled={!nickname}
              onClick={() => setShowName((v) => !v)}
            >
              Show my name
            </button>
            {!nickname && (
              <p className="text-xs text-muted">Add a nickname in Edit profile to use this.</p>
            )}
          </div>
          <label className="btn-ghost cursor-pointer rounded-xl border-dashed">
            {photo ? "Change photo" : "+ Photo"}
            <input type="file" accept="image/*" onChange={onPickPhoto} className="sr-only" />
          </label>
          {photo && (
            <button
              type="button"
              className="btn-ghost btn-quiet"
              onClick={() =>
                setPhoto((old) => {
                  old?.close();
                  return null;
                })
              }
            >
              Remove photo
            </button>
          )}
        </div>
      </div>

      <p className="text-[0.8125rem] text-muted">Photos stay on your device. Nothing is uploaded.</p>

      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => exportPicture(downloadBlob, "Couldn't save the picture. Try again.")}
          className="btn-ghost h-[3.25rem] border-ink text-base font-bold"
        >
          Download
        </button>
        {supportsFileShare() ? (
          <button
            onClick={() =>
              exportPicture(
                (blob, name) => shareBlob(blob, name, "My day on Habbit"),
                "Couldn't open the share sheet. Use Download instead.",
              )
            }
            className="btn"
          >
            Share...
          </button>
        ) : (
          <span />
        )}
      </div>
    </>
  );
}
