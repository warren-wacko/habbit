// How far back the app lets someone look: no further than the day their first habit began.

/**
 * The earliest day worth showing: the day the oldest habit was created, or today when there are
 * no habits yet (a brand-new user sees only today).
 */
export function earliestStart(createdDays: readonly string[], today: string): string {
  return createdDays.reduce((min, d) => (d < min ? d : min), today);
}

/** Whether a habit already existed on a day. Unknown creation days count as existing. */
export function existedOn(created: string | undefined, day: string): boolean {
  return created === undefined || created <= day;
}
