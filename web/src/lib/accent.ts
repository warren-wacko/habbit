// The app's colour theme: a main colour (the green on ticks, main buttons, the ring and charts)
// and a partner (the purple on links and the "Partial" bars). The user picks one of six pairs; it is saved on their account and cached on the device
// so the page does not flash the default while it loads.

import { HABIT_COLORS, type HabitColor } from "./types";

export const ACCENT_KEY = "habbit-accent";

// Each theme is a pair: the main colour and its partner. The saved value is the main colour's name.
export const ACCENT_LABEL: Record<HabitColor, string> = {
  volt: "Volt & Violet",
  aqua: "Aqua & Magenta",
  sky: "Sky & Amber",
  violet: "Violet & Lime",
  rose: "Rose & Teal",
  sand: "Sand & Blue",
};

/** Whether a stored value is one of the accents (anything else is ignored) */
export function isAccent(value: unknown): value is HabitColor {
  return typeof value === "string" && (HABIT_COLORS as readonly string[]).includes(value);
}

/** The attribute value for the page: null for volt, which is the default and needs none */
export function accentAttribute(accent: HabitColor): string | null {
  return accent === "volt" ? null : accent;
}

/** Use an accent now and remember it on this device */
export function applyAccent(accent: HabitColor): void {
  const root = document.documentElement;
  const value = accentAttribute(accent);
  if (value) root.setAttribute("data-accent", value);
  else root.removeAttribute("data-accent");
  try {
    localStorage.setItem(ACCENT_KEY, accent);
  } catch {
    // private windows can refuse storage: the accent still applies for this visit
  }
}

/** Back to the default and forget the device's copy, for when someone signs out */
export function clearAccent(): void {
  if (typeof document === "undefined") return;
  document.documentElement.removeAttribute("data-accent");
  try {
    localStorage.removeItem(ACCENT_KEY);
  } catch {
    // nothing to forget
  }
}
