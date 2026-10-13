"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { tokenStore } from "@/lib/api";
import { addDays, toISO, todayLocal } from "@/lib/dates";
import { ACCENT_LABEL, applyAccent } from "@/lib/accent";
import { downloadExport, type ExportFormat } from "@/lib/exportDownload";
import { HISTORY_DAYS, useArchivedHistory, useUpdateHabit } from "@/lib/habits";
import { computeStreaks } from "@/lib/streaks";
import { useTheme, type ThemeChoice } from "@/lib/theme";
import { HABIT_COLORS, type HabitColor } from "@/lib/types";
import { displayName, initialOf } from "@/lib/profile";
import { useMe, useUpdateProfile } from "@/lib/useMe";
import { useOverall } from "@/lib/useOverall";
import { Avatar } from "./Avatar";
import { Loader } from "./Loader";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { DeleteAccountForm } from "./DeleteAccountSection";
import { HabitTile } from "./habitIcons";
import {
  CheckIcon,
  ChevronRightIcon,
  CompassIcon,
  DownloadIcon,
  LogOutIcon,
  PencilIcon,
} from "./icons";
import { ProfileSheet } from "./ProfileSheet";
import { Sheet } from "./Sheet";
import { Tour } from "./Tour";

const THEMES: { key: ThemeChoice; label: string }[] = [
  { key: "system", label: "System" },
  { key: "light", label: "Light" },
  { key: "dark", label: "Dark" },
];

const ROW =
  "flex h-14 w-full items-center justify-between border-t border-line text-base font-semibold first:border-t-0";

export function YouView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const today = todayLocal();
  const from = addDays(today, -(HISTORY_DAYS - 1));

  const me = useMe();
  const { history, overall } = useOverall();
  const archived = useArchivedHistory();
  const restore = useUpdateHabit();
  const [theme, setTheme] = useTheme();
  const updateProfile = useUpdateProfile();
  const [tourOpen, setTourOpen] = useState(false);
  const [sheet, setSheet] = useState<"password" | "delete" | "profile" | null>(null);
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const lifetime = useMemo(() => {
    let checkIns = 0;
    let perfect = 0;
    for (const t of overall?.byDay.values() ?? []) {
      checkIns += t.done;
      if (t.scheduled > 0 && t.done === t.scheduled) perfect += 1;
    }
    return { checkIns, perfect };
  }, [overall]);

  const email = me.data?.email ?? "";
  const name = me.data ? displayName(me.data) : "";
  const hasNickname = !!me.data?.nickname?.trim();
  const created = me.data ? toISO(new Date(me.data.createdAt)) : null;
  const daysTracked = created
    ? Math.max(1, Math.round((Date.parse(today) - Date.parse(created)) / 86_400_000) + 1)
    : 0;

  async function download(format: ExportFormat) {
    setExportError(null);
    setDownloading(format);
    try {
      await downloadExport(format, today);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Couldn't download your data. Try again.");
    } finally {
      setDownloading(null);
    }
  }

  // the colour changes at once, and goes back if the account could not be updated
  function pickAccent(next: HabitColor) {
    const before = me.data?.accent ?? "volt";
    if (next === before) return;
    applyAccent(next);
    updateProfile.mutate({ accent: next }, { onError: () => applyAccent(before) });
  }

  function logout() {
    tokenStore.clear();
    queryClient.clear();
    router.replace("/login");
  }

  const stat = (value: number | string, label: string, cell: string, volt = false) => (
    <div className={`border-hero-track ${cell}`}>
      <div className="display num text-[1.75rem]" style={volt ? { color: "var(--volt)" } : undefined}>
        {value}
      </div>
      <div className="caps lbl mt-1 text-[0.6875rem] tracking-[0.06em]">{label}</div>
    </div>
  );

  return (
    <>
      <h1 className="display text-[2.125rem]">You</h1>

      <section className="hero flex flex-col gap-[18px]" aria-label="Your account">
        <div className="flex items-center gap-3.5">
          <Avatar
            color={me.data?.avatarColor ?? "volt"}
            icon={me.data?.avatarIcon ?? null}
            initial={me.data ? initialOf(me.data) : "Y"}
            size={56}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[1.0625rem] font-bold">{name}</div>
            {hasNickname && <div className="lbl truncate text-[0.8125rem]">{email}</div>}
            {created && (
              <div className="lbl text-[0.8125rem]">
                Joined{" "}
                {new Date(created + "T00:00:00").toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSheet("profile")}
            disabled={!me.data}
            aria-label="Edit profile"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 self-start rounded-full border border-hero-track px-3.5 text-sm font-bold text-hero-fg hover:bg-hero-track disabled:opacity-50"
          >
            <PencilIcon size={16} />
            Edit
          </button>
        </div>
        {/* a 2 x 2 grid: hairlines between the stats, each with room for its label */}
        <div className="grid grid-cols-2 border-t border-hero-track">
          {stat(lifetime.checkIns, "Done", "border-b border-r py-4 pr-4")}
          {stat(lifetime.perfect, "Perfect days", "border-b py-4 pl-5", true)}
          {stat(history.data?.habits.length ?? 0, "Habits", "border-r pt-4 pr-4")}
          {stat(daysTracked, "Days joined", "pt-4 pl-5")}
        </div>
      </section>

      <section className="card gap-2.5 p-4" aria-labelledby="appearance-heading">
        <span id="appearance-heading" className="caps text-xs text-muted">
          Appearance
        </span>
        <div className="seg" role="group" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.key}
              aria-pressed={theme === t.key}
              onClick={() => setTheme(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span id="accent-heading" className="caps mt-1 text-xs text-muted">
          Colour theme
        </span>
        <div className="grid grid-cols-6 gap-2.5" role="group" aria-labelledby="accent-heading">
          {HABIT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={ACCENT_LABEL[c]}
              aria-pressed={(me.data?.accent ?? "volt") === c}
              onClick={() => pickAccent(c)}
              disabled={!me.data}
              className="swatch swatch-pair"
              style={
                {
                  "--sw-main": `var(--h-${c})`,
                  "--sw-l": `var(--pair-${c}-l)`,
                  "--sw-d": `var(--pair-${c}-d)`,
                } as React.CSSProperties
              }
            >
              <CheckIcon size={18} strokeWidth={2.6} />
            </button>
          ))}
        </div>
        <p className="text-xs text-muted" aria-live="polite">
          {ACCENT_LABEL[me.data?.accent ?? "volt"]}
        </p>
        {updateProfile.isError && (
          <p role="alert" className="alert">
            Couldn&apos;t save your theme. It&apos;s back to what it was.
          </p>
        )}
      </section>

      <section className="card gap-0 px-4 py-1.5" aria-labelledby="data-heading">
        <span id="data-heading" className="caps mb-1 mt-2.5 text-xs text-muted">
          Your data
        </span>
        <button className={ROW} disabled={downloading !== null} onClick={() => download("json")}>
          {downloading === "json" ? "Preparing..." : "Download everything (JSON)"}
          <DownloadIcon />
        </button>
        <button className={ROW} disabled={downloading !== null} onClick={() => download("csv")}>
          {downloading === "csv" ? "Preparing..." : "Download a spreadsheet (CSV)"}
          <DownloadIcon />
        </button>
        {exportError && (
          <p role="alert" className="alert my-2">
            {exportError}
          </p>
        )}
        <p className="pb-3 pt-1 text-xs text-muted">
          The JSON file is a full copy: your habits, every day you finished, and your notes. The CSV
          lists the days you finished. Notes are plain text, so keep the file somewhere private.
        </p>
      </section>

      <section className="card gap-0 px-4 pb-1.5 pt-4" aria-labelledby="archived-heading">
        <span id="archived-heading" className="caps mb-1.5 text-xs text-muted">
          Archived habits · {archived.data?.habits.length ?? 0}
        </span>
        {archived.isPending && (
          <div className="flex justify-center py-4">
            <Loader size={28} label="Loading archived habits" />
          </div>
        )}
        {archived.isError && (
          <p role="alert" className="alert my-2">
            {archived.error.message}
          </p>
        )}
        {archived.data?.habits.length === 0 && (
          <p className="pb-3 text-sm text-muted">
            Nothing archived. Archive a habit from its detail page to hide it without losing its
            history.
          </p>
        )}
        {archived.data?.habits.map((h) => {
          const best = computeStreaks(
            new Set(h.dates),
            today,
            from,
            h.scheduleDays,
            new Set(h.skips ?? []),
          ).best;
          return (
            <div
              key={h.id}
              className="flex min-h-[3.625rem] items-center gap-3 border-t border-line first:border-t-0"
            >
              <HabitTile color={h.color} icon={h.icon} name={h.name} size={36} />
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem]">{h.name}</b>
                <span className="text-xs text-muted">
                  {h.dates.length} done · best streak {best}
                </span>
              </span>
              <button
                className="btn-ghost h-10"
                disabled={restore.isPending}
                onClick={() => restore.mutate({ id: h.id, archived: false })}
              >
                Restore
              </button>
            </div>
          );
        })}
        {restore.isError && (
          <p role="alert" className="alert my-2">
            {restore.error.message}
          </p>
        )}
      </section>

      <section className="card gap-0 px-4 py-1.5" aria-labelledby="account-heading">
        <span id="account-heading" className="caps mb-1 mt-2.5 text-xs text-muted">
          Account
        </span>
        <button className={ROW} onClick={() => setTourOpen(true)}>
          Show the tour again
          <CompassIcon />
        </button>
        <button className={ROW} onClick={() => setSheet("password")}>
          Change password
          <ChevronRightIcon />
        </button>
        <button className={ROW} onClick={logout}>
          Log out
          <LogOutIcon />
        </button>
        <button className={`${ROW} text-danger`} onClick={() => setSheet("delete")}>
          Delete account
          <ChevronRightIcon />
        </button>
      </section>
      <p className="text-center text-xs text-muted">
        Deleting removes your account, every habit and all history for good.
      </p>

      {me.data && (
        <ProfileSheet open={sheet === "profile"} onClose={() => setSheet(null)} me={me.data} />
      )}
      <Tour open={tourOpen} onClose={() => setTourOpen(false)} markDone={false} />
      <Sheet open={sheet === "password"} onClose={() => setSheet(null)} title="Change password">
        <ChangePasswordForm />
      </Sheet>
      <Sheet open={sheet === "delete"} onClose={() => setSheet(null)} title="Delete account">
        <DeleteAccountForm onCancel={() => setSheet(null)} />
      </Sheet>
    </>
  );
}
