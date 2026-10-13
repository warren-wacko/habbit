// Counted habits ("8 glasses", "20 pages"): a day is done when its amount reaches the
// target that applies to it. This mirrors the API's rule (api/src/lib/progress.ts) so the
// screen can show the result before the server answers.

export const MAX_TARGET = 10_000;
export const MAX_AMOUNT = 100_000;
export const OVERSHOOT = 10; // an amount may go up to this many times the target

/** The most that can be logged in a day */
export function amountCap(target: number): number {
  return Math.min(MAX_AMOUNT, target * OVERSHOOT);
}

type DayState = { doneOnDate: boolean; target: number; targetOnDate: number };

/** The target that judges this day: a finished day keeps the target it was reached under */
export function effectiveTarget(h: DayState): number {
  return h.doneOnDate ? h.targetOnDate : h.target;
}

/** What the day looks like after the amount is set to `amount` */
export function afterProgress(
  h: DayState,
  amount: number,
): { done: boolean; amount: number | null; target: number } {
  if (amount <= 0) return { done: false, amount: null, target: h.target };
  const eff = effectiveTarget(h);
  const done = amount >= eff;
  return { done, amount, target: done ? eff : h.target };
}

/** A habit is counted when it, or the day being shown, has a target above 1 */
export function isCounted(h: { target: number; targetOnDate: number }): boolean {
  return h.target > 1 || h.targetOnDate > 1;
}

// One-tap goals for the editor. Each fills in the unit and target (and, for a new habit
// with no name yet, the name, icon and colour).
export const GOAL_PRESETS = [
  { name: "Drink water", unit: "glasses", target: 8, icon: "water", color: "aqua" },
  { name: "Read", unit: "pages", target: 20, icon: "read", color: "violet" },
  { name: "Meditate", unit: "minutes", target: 10, icon: "meditate", color: "sky" },
  { name: "Workout", unit: "minutes", target: 30, icon: "strength", color: "volt" },
  { name: "Reps", unit: "reps", target: 20, icon: "strength", color: "rose" },
  { name: "Walk", unit: "km", target: 5, icon: "run", color: "sand" },
] as const;

/**
 * Whether "Count as done" is offered: a counted habit, with some progress that day, under
 * the goal, not already done and not skipped.
 */
export function canCountAsDone(h: {
  target: number;
  targetOnDate: number;
  doneOnDate: boolean;
  skippedOnDate: boolean;
  amountOnDate: number | null;
}): boolean {
  const amount = h.amountOnDate ?? 0;
  return isCounted(h) && !h.doneOnDate && !h.skippedOnDate && amount > 0 && amount < h.target;
}

/** What editing a goal does, for the note in the editor */
export function goalChange(current: number, entered: number): "raise" | "lower" | "same" {
  return entered > current ? "raise" : entered < current ? "lower" : "same";
}

/**
 * How much the + and - buttons add for a goal of this size, so that "30 minutes" does not
 * take thirty taps: small goals move by 1, bigger goals by bigger steps.
 */
export function stepFor(target: number): number {
  if (target <= 12) return 1; // 8 glasses, 5 km
  if (target <= 40) return 5; // 30 minutes, 20 reps
  if (target <= 120) return 10; // 60 minutes
  if (target <= 600) return 50; // 300 pages
  if (target <= 1200) return 100;
  if (target <= 3000) return 250; // 2000 ml
  return 1000; // 8000 steps
}

/** The quick-add amounts in the type-an-amount sheet: one, two and three steps */
export function amountChips(step: number): number[] {
  return [step, step * 2, step * 3];
}

/** Move an amount one step up or down, never below 0 or above the cap */
export function nudge(amount: number, direction: 1 | -1, step: number, cap: number): number {
  return Math.min(cap, Math.max(0, amount + direction * step));
}
