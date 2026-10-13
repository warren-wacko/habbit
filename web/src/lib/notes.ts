// A note is a short bit of plain text on one day of a habit.

export const MAX_NOTE = 280; // keep in step with the API (api/src/schemas/habit.ts)

export type Note = { date: string; text: string };

/** The note for a day, or "" when there is none */
export function noteFor(notes: readonly Note[] | undefined, date: string): string {
  return notes?.find((n) => n.date === date)?.text ?? "";
}

/** Notes newest first, whatever order they arrive in */
export function newestFirst(notes: readonly Note[]): Note[] {
  return [...notes].sort((a, b) => b.date.localeCompare(a.date));
}
