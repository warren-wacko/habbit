import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { afterProgress } from "./counts";
import type { Note } from "./notes";
import type { TimeOfDay } from "./timeOfDay";
import { addDays, todayLocal } from "./dates";
import { normalizeHabit, normalizeHistoryHabit } from "./legacy";
import type {
  Habit,
  HabitCount,
  HabitStyle,
  HabitWhen,
  HistoryResponse,
  ProgressResponse,
  RawStyle,
  SkipResponse,
  ToggleResponse,
} from "./types";

// Rows saved before the redesign may carry an emoji icon or an old colour name;
// everything below hands the rest of the app the new shapes (see lib/legacy.ts).
type RawHabit = Omit<Habit, "color" | "icon"> & RawStyle;
type RawHistory = Omit<HistoryResponse, "habits"> & {
  habits: (HistoryResponse["habits"][number] & RawStyle)[];
};

export function useHabits(date: string) {
  return useQuery({
    queryKey: ["habits", date],
    queryFn: async () =>
      (await api<RawHabit[]>(`/api/habits?date=${date}`)).map(normalizeHabit),
  });
}

// A year of completion dates, enough for streaks, records and the 12-week heatmap.
// Dates are the user's local days, so numbers match what they see on screen.
export const HISTORY_DAYS = 365;

function historyRange() {
  const to = todayLocal();
  return { from: addDays(to, -(HISTORY_DAYS - 1)), to };
}

export function useHistory() {
  const { from, to } = historyRange();
  return useQuery({
    queryKey: ["habits", "history", from, to],
    queryFn: async (): Promise<HistoryResponse> => {
      const r = await api<RawHistory>(`/api/habits/history?from=${from}&to=${to}`);
      return { ...r, habits: r.habits.map(normalizeHistoryHabit) };
    },
  });
}

// Archived habits with their completions, for the "You" screen
export function useArchivedHistory() {
  const { from, to } = historyRange();
  return useQuery({
    queryKey: ["habits", "history-archived", from, to],
    queryFn: async (): Promise<HistoryResponse> => {
      const r = await api<RawHistory>(
        `/api/habits/history?from=${from}&to=${to}&archived=true`,
      );
      return { ...r, habits: r.habits.map(normalizeHistoryHabit) };
    },
  });
}

export function useAddHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      vars: { name: string } & Partial<HabitStyle> & Partial<HabitCount> & Partial<HabitWhen>,
    ) =>
      api<{ id: number; name: string }>("/api/habits", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });
}

export function useUpdateHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...changes
    }: { id: number; name?: string; archived?: boolean; today?: string } & Partial<HabitStyle> &
      Partial<HabitCount> &
      Partial<HabitWhen>) =>
      api<{ id: number; name: string }>(`/api/habits/${id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });
}

// Optimistic: the tick shows instantly, and rolls back if the server says no.
export function useToggleHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; date: string }) =>
      api<ToggleResponse>(`/api/habits/${vars.id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ date: vars.date }),
      }),
    onMutate: async ({ id, date }) => {
      await queryClient.cancelQueries({ queryKey: ["habits"] });

      const previousList = queryClient.getQueryData<Habit[]>(["habits", date]);
      const previousHistory = queryClient.getQueriesData<HistoryResponse>({
        queryKey: ["habits", "history"],
      });

      queryClient.setQueryData<Habit[]>(["habits", date], (old) =>
        old?.map((h) =>
          h.id === id
            ? {
                ...h,
                doneOnDate: !h.doneOnDate,
                skippedOnDate: false,
                // ticking a counted habit in one go counts as the full target
                amountOnDate: !h.doneOnDate && h.target > 1 ? h.target : null,
                targetOnDate: !h.doneOnDate && h.target === 1 ? 1 : h.target,
              }
            : h,
        ),
      );
      queryClient.setQueriesData<HistoryResponse>(
        { queryKey: ["habits", "history"] },
        (old) =>
          old && {
            ...old,
            habits: old.habits.map((h) => {
              if (h.id !== id) return h;
              const done = h.dates.includes(date);
              return {
                ...h,
                dates: done
                  ? h.dates.filter((d) => d !== date)
                  : [...h.dates, date].sort(),
                // ticking a skipped day replaces the skip
                skips: done ? h.skips : h.skips?.filter((d) => d !== date),
              };
            }),
          },
      );

      return { previousList, previousHistory, date };
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData(["habits", ctx.date], ctx.previousList);
      for (const [key, data] of ctx.previousHistory) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });
}

// Optimistic: set how much of a counted habit was done on a day. Reaching the
// target finishes the day; the server decides, and this rolls back if it refuses.
export function useSetProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; date: string; amount: number }) =>
      api<ProgressResponse>(`/api/habits/${vars.id}/progress`, {
        method: "POST",
        body: JSON.stringify({ date: vars.date, amount: vars.amount }),
      }),
    onMutate: async ({ id, date, amount }) => {
      await queryClient.cancelQueries({ queryKey: ["habits"] });

      const previousList = queryClient.getQueryData<Habit[]>(["habits", date]);
      const previousHistory = queryClient.getQueriesData<HistoryResponse>({
        queryKey: ["habits", "history"],
      });
      const before = previousList?.find((h) => h.id === id);
      const after = before && afterProgress(before, amount);

      if (before && after) {
        queryClient.setQueryData<Habit[]>(["habits", date], (old) =>
          old?.map((h) =>
            h.id === id
              ? {
                  ...h,
                  doneOnDate: after.done,
                  amountOnDate: after.amount,
                  targetOnDate: after.target,
                  skippedOnDate: after.done ? false : h.skippedOnDate,
                }
              : h,
          ),
        );
        queryClient.setQueriesData<HistoryResponse>(
          { queryKey: ["habits", "history"] },
          (old) =>
            old && {
              ...old,
              habits: old.habits.map((h) => {
                if (h.id !== id) return h;
                const has = h.dates.includes(date);
                const dates = after.done
                  ? has ? h.dates : [...h.dates, date].sort()
                  : h.dates.filter((d) => d !== date);
                return {
                  ...h,
                  dates,
                  skips: after.done ? h.skips?.filter((d) => d !== date) : h.skips,
                };
              }),
            },
        );
      }

      return { previousList, previousHistory, date };
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData(["habits", ctx.date], ctx.previousList);
      for (const [key, data] of ctx.previousHistory) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });
}

// Save a new order for the habits (their ids, first to last). The lists show it at once.
export function useReorderHabits() {
  const queryClient = useQueryClient();
  const sorted = <T extends { id: number }>(list: T[], ids: number[]) =>
    [...list].sort((a, b) => {
      const ia = ids.indexOf(a.id);
      const ib = ids.indexOf(b.id);
      return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
    });
  return useMutation({
    mutationFn: (vars: { ids: number[]; timeOfDay?: Record<number, TimeOfDay> }) =>
      api<{ ids: number[] }>("/api/habits/order", {
        method: "PUT",
        body: JSON.stringify(vars),
      }),
    onMutate: async ({ ids, timeOfDay }) => {
      await queryClient.cancelQueries({ queryKey: ["habits"] });
      const retimed = <T extends { id: number; timeOfDay: TimeOfDay }>(list: T[]) =>
        list.map((h) => (timeOfDay?.[h.id] ? { ...h, timeOfDay: timeOfDay[h.id] } : h));
      // the day lists are the queries shaped ["habits", "<date>"]
      queryClient.setQueriesData<Habit[]>(
        { queryKey: ["habits"], predicate: (q) => q.queryKey.length === 2 },
        (old) => old && sorted(retimed(old), ids),
      );
      queryClient.setQueriesData<HistoryResponse>(
        { queryKey: ["habits", "history"] },
        (old) => old && { ...old, habits: sorted(retimed(old.habits), ids) },
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });
}

// A habit's notes, newest first (only loaded where they are shown: the habit page)
export function useNotes(id: number) {
  return useQuery({
    queryKey: ["habits", "notes", id],
    queryFn: () => api<Note[]>(`/api/habits/${id}/notes`),
  });
}

// Set the note on one day; empty text removes it
export function useSetNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; date: string; text: string }) =>
      api<{ id: number; date: string; text: string | null }>(`/api/habits/${vars.id}/note`, {
        method: "PUT",
        body: JSON.stringify({ date: vars.date, text: vars.text }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });
}

// Finish a day that has some progress by making what was done that day's goal.
export function useCountAsDone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; date: string }) =>
      api<ProgressResponse>(`/api/habits/${vars.id}/count-as-done`, {
        method: "POST",
        body: JSON.stringify({ date: vars.date }),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });
}

// Optimistic like the tick: skip (or un-skip) one day of one habit.
export function useSkipHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: number; date: string }) =>
      api<SkipResponse>(`/api/habits/${vars.id}/skip`, {
        method: "POST",
        body: JSON.stringify({ date: vars.date }),
      }),
    onMutate: async ({ id, date }) => {
      await queryClient.cancelQueries({ queryKey: ["habits"] });

      const previousList = queryClient.getQueryData<Habit[]>(["habits", date]);
      const previousHistory = queryClient.getQueriesData<HistoryResponse>({
        queryKey: ["habits", "history"],
      });

      queryClient.setQueryData<Habit[]>(["habits", date], (old) =>
        old?.map((h) => (h.id === id ? { ...h, skippedOnDate: !h.skippedOnDate } : h)),
      );
      queryClient.setQueriesData<HistoryResponse>(
        { queryKey: ["habits", "history"] },
        (old) =>
          old && {
            ...old,
            habits: old.habits.map((h) => {
              if (h.id !== id) return h;
              const skips = h.skips ?? [];
              return {
                ...h,
                skips: skips.includes(date)
                  ? skips.filter((d) => d !== date)
                  : [...skips, date].sort(),
              };
            }),
          },
      );

      return { previousList, previousHistory, date };
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData(["habits", ctx.date], ctx.previousList);
      for (const [key, data] of ctx.previousHistory) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });
}

export function useDeleteHabit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      api<void>(`/api/habits/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["habits"] }),
  });
}
