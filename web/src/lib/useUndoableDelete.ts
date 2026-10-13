import { useEffect, useRef, useState } from "react";
import { useDeleteHabit } from "./habits";

const UNDO_MS = 6000;

type Target = { id: number; name: string };

/**
 * Deleting is undoable: the habit hides at once, and the real DELETE is only
 * sent when the undo window closes (or when the user leaves the page).
 */
export function useUndoableDelete() {
  const remove = useDeleteHabit();
  const [hidden, setHidden] = useState<number[]>([]);
  const [toast, setToast] = useState<Target | null>(null);
  const pending = useRef<{
    id: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  function commit() {
    const p = pending.current;
    if (!p) return;
    clearTimeout(p.timer);
    pending.current = null;
    setToast(null);
    remove.mutate(p.id, {
      // on success the list refetches without it; on failure it reappears
      onSettled: () => setHidden((ids) => ids.filter((id) => id !== p.id)),
    });
  }

  function start(habit: Target) {
    commit(); // a second delete flushes the first
    setHidden((ids) => [...ids, habit.id]);
    setToast({ id: habit.id, name: habit.name });
    pending.current = { id: habit.id, timer: setTimeout(commit, UNDO_MS) };
  }

  function undo() {
    const p = pending.current;
    if (!p) return;
    clearTimeout(p.timer);
    pending.current = null;
    setHidden((ids) => ids.filter((id) => id !== p.id));
    setToast(null);
  }

  // Leaving the page counts as "yes, delete it"
  useEffect(
    () => () => {
      const p = pending.current;
      if (!p) return;
      clearTimeout(p.timer);
      remove.mutate(p.id);
    },
    // only on unmount; `remove` is read from the closure at that moment
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { hidden, toast, start, undo, isError: remove.isError };
}
