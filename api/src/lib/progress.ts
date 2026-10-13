// The rule behind counted habits ("8 glasses", "20 pages").
// A day is done when its amount reaches the target that applies to it:
// - a day that is already done keeps the target it was reached under, so raising a
//   habit's target later never un-does a finished day
// - any other day is judged by the habit's current target

export const MAX_TARGET = 10_000;
export const MAX_AMOUNT = 100_000;
export const OVERSHOOT = 10; // an amount may go up to this many times the target

// The most that can be logged in a day
export function amountCap(target: number): number {
  return Math.min(MAX_AMOUNT, target * OVERSHOOT);
}

/**
 * "Count as done": a day with some progress, under its goal, is finished by making what
 * was done that day's goal. The habit's own target is not touched, so other days still
 * need the full target. After this the ordinary rule applies, so nothing else is special.
 * Returns the target to store for the day, or null when it cannot be counted.
 */
export function countAsDone(amount: number, habitTarget: number, isDone: boolean): number | null {
  if (isDone || amount <= 0 || amount >= habitTarget) return null;
  return amount;
}

export type ProgressOutcome =
  | { kind: "clear" } // amount 0: remove the progress (and un-do the day)
  | { kind: "set"; done: boolean; storedTarget: number };

/**
 * @param amount       the new amount for the day
 * @param habitTarget  the habit's target right now
 * @param doneTarget   the target the day was finished under, or null if it is not done
 */
export function resolveProgress(
  amount: number,
  habitTarget: number,
  doneTarget: number | null,
): ProgressOutcome {
  if (amount <= 0) return { kind: "clear" };
  const effective = doneTarget ?? habitTarget;
  const done = amount >= effective;
  return { kind: "set", done, storedTarget: done ? effective : habitTarget };
}
