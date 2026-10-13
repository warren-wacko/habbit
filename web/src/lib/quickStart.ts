import type { HabitColor, HabitIconKey } from "./types";

// One-tap starting points, used by the empty state and the editor's "Quick start"
export const QUICK_START: { name: string; icon: HabitIconKey; color: HabitColor }[] = [
  { name: "Drink water", icon: "water", color: "aqua" },
  { name: "Read 10 pages", icon: "read", color: "violet" },
  { name: "Go for a walk", icon: "run", color: "volt" },
  { name: "Meditate", icon: "meditate", color: "sky" },
  { name: "Stretch", icon: "stretch", color: "sand" },
];
