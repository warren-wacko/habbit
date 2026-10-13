// The first-time tour: a few short screens that point out what the app can do, including the
// things that are easy to miss. Kept short on purpose: a headline, one sentence and up to
// three tips each.

export type TourSlide = {
  id: "tick" | "habits" | "days" | "menu" | "progress" | "you";
  title: string;
  body: string;
  tips: string[];
};

export const TOUR_SLIDES: TourSlide[] = [
  {
    id: "tick",
    title: "Tick it off, build a streak",
    body: "Tap the circle when you've done a habit. Keep going day after day and your streak grows.",
    tips: [
      "Finish every habit for a Perfect day",
      "The ring at the top shows how today is going",
      "The share button turns a day into a picture",
    ],
  },
  {
    id: "habits",
    title: "Habits that fit you",
    body: "Press New to add a habit with its own icon, colour and days of the week.",
    tips: [
      "Set a goal like 8 glasses or 20 pages, then use + and − (tap the number to type it)",
      "Group habits into Morning, Afternoon and Evening",
      "Pick a Quick start to save time",
    ],
  },
  {
    id: "days",
    title: "Any day, even yesterday",
    body: "Forgot to log something? Tap a day in the strip, or use the calendar button, and fix it.",
    tips: [
      "You can edit days up to a year back",
      "Streaks and stats update straight away",
    ],
  },
  {
    id: "menu",
    title: "The ⋯ menu is your toolbox",
    body: "Tap ⋯ on any habit to see what else you can do.",
    tips: [
      "Skip a day without losing your streak",
      "Count a short day as done, on habits with a goal",
      "Add a note, edit, archive, or delete (and undo a delete)",
    ],
  },
  {
    id: "progress",
    title: "See how you're doing",
    body: "Progress shows week, month and year views. Tap a habit to open its own page.",
    tips: [
      "On a habit's page, tap any calendar day to read or write a note",
      "Press Reorder on Today to rearrange your habits",
    ],
  },
  {
    id: "you",
    title: "Make it yours",
    body: "The You page is where the app becomes yours.",
    tips: [
      "Add a nickname, an avatar and a colour theme",
      "Light, dark, or follow your phone",
      "Download your data any time, or restore archived habits",
    ],
  },
];

/** Keeps a step inside the slides, so Back on the first and Next on the last do nothing odd */
export function clampStep(step: number, count: number): number {
  return Math.min(count - 1, Math.max(0, step));
}
