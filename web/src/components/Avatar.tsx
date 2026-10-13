"use client";

import type { HabitColor, HabitIconKey } from "@/lib/types";
import { HABIT_ICONS } from "./habitIcons";

/** The round avatar: a habit colour with either a drawn icon or the user's initial */
export function Avatar({
  color,
  icon,
  initial,
  size = 56,
}: {
  color: HabitColor;
  icon: HabitIconKey | null;
  initial: string;
  size?: number;
}) {
  const Icon = icon ? HABIT_ICONS[icon].Icon : null;
  return (
    <span
      aria-hidden="true"
      className="display grid shrink-0 place-items-center rounded-full font-black text-on-volt"
      style={{
        width: size,
        height: size,
        background: `var(--h-${color})`,
        fontSize: size * 0.4,
      }}
    >
      {Icon ? <Icon size={Math.round(size * 0.48)} strokeWidth={1.8} /> : initial}
    </span>
  );
}
