// How the signed-in user shows up: a nickname, a colour, and an icon or their initial.

import type { HabitColor, HabitIconKey } from "./types";

export const MAX_NICKNAME = 30; // keep in step with the API (api/src/schemas/auth.ts)

export type Me = {
  id: number;
  email: string;
  createdAt: string;
  nickname: string | null;
  avatarIcon: HabitIconKey | null;
  avatarColor: HabitColor;
  accent: HabitColor;
  onboardedAt: string | null; // null until the first-time tour is finished or skipped
};

/** The name to show: the nickname when there is one, otherwise the email */
export function displayName(me: Pick<Me, "email" | "nickname">): string {
  return me.nickname?.trim() || me.email;
}

/** The first letter of the nickname (or the email), as a whole character: emoji stay whole */
export function initialOf(me: Pick<Me, "email" | "nickname">): string {
  const first = Array.from(displayName(me).trim())[0];
  return first ? first.toUpperCase() : "Y";
}

/** A nickname as it will be sent: trimmed, and null when empty so it clears */
export function cleanNickname(input: string): string | null {
  const trimmed = input.trim();
  return trimmed === "" ? null : trimmed;
}
