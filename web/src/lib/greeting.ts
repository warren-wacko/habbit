import { useEffect, useState } from "react";

/** The greeting for an hour of the day (0-23) in the user's own time */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Hi"; // the small hours: no pretending it is morning or evening
}

/** "Good morning, Sam", or just "Good morning" when there is no nickname */
export function greetingLine(hour: number, nickname: string | null | undefined): string {
  const name = nickname?.trim();
  return name ? `${greetingFor(hour)}, ${name}` : greetingFor(hour);
}

/** The current hour, kept up to date so the greeting changes while the app stays open */
export function useHour(): number {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const tick = () => setHour(new Date().getHours());
    const timer = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return hour;
}
