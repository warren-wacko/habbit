import { z } from "zod";
import { HABIT_COLORS, HABIT_ICON_KEYS } from "./habit.js";

export const registerBody = z.object({
  email: z.email().trim().toLowerCase().max(254),
  password: z.string().min(8, "At least 8 characters").max(72),
});

export const loginBody = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "At least 8 characters required").max(72),
});

export const deleteAccountBody = z.object({
  password: z.string().min(1, "Password is required"),
});

export const MAX_NICKNAME = 30;

// Change how the user shows up, and the app's accent colour. A nickname is plain text: no line breaks or other control
// characters. An empty nickname, or null, clears it. A null icon goes back to the initial.
export const profileBody = z
  .object({
    nickname: z
      .string()
      .trim()
      .max(MAX_NICKNAME, `At most ${MAX_NICKNAME} characters`)
      .regex(/^[^\p{Cc}\p{Cf}]*$/u, "Use letters, numbers and punctuation only")
      .nullable()
      .optional(),
    avatarIcon: z.enum(HABIT_ICON_KEYS).nullable().optional(),
    avatarColor: z.enum(HABIT_COLORS).optional(),
    accent: z.enum(HABIT_COLORS).optional(),
    // the first-time tour was finished or skipped; it can only be marked done, never undone
    onboarded: z.literal(true).optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Nothing to update");
