import { useEffect, useState } from "react";
import { todayLocal } from "./dates";

/**
 * Today's date in the user's timezone, kept current: it updates at local midnight
 * and when the tab or app comes back to the front (timers pause while it sleeps).
 */
export function useToday(): string {
  const [today, setToday] = useState(todayLocal);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => setToday(todayLocal());
    const schedule = () => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => {
        refresh();
        schedule();
      }, midnight.getTime() - now.getTime() + 500);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return today;
}
