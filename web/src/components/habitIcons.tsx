import {
  BookOpen,
  Coffee,
  Droplet,
  Dumbbell,
  Flower2,
  Footprints,
  Moon,
  Music,
  PenLine,
  Palette,
  PersonStanding,
  Pill,
  Salad,
  Smile,
  Sparkles,
  Sprout,
  Sun,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { HabitColor, HabitIconKey } from "@/lib/types";

// The 18 habit icons from the design, drawn with Lucide. The key is what is
// stored on the habit; swapping a glyph only ever happens here.
export const HABIT_ICONS: Record<HabitIconKey, { label: string; Icon: LucideIcon }> = {
  run: { label: "Run", Icon: Footprints },
  water: { label: "Water", Icon: Droplet },
  read: { label: "Read", Icon: BookOpen },
  meditate: { label: "Meditate", Icon: Flower2 },
  strength: { label: "Strength", Icon: Dumbbell },
  food: { label: "Eat well", Icon: Salad },
  sleep: { label: "Sleep", Icon: Moon },
  journal: { label: "Journal", Icon: PenLine },
  music: { label: "Music", Icon: Music },
  tidy: { label: "Tidy", Icon: Sparkles },
  teeth: { label: "Teeth", Icon: Smile }, // Lucide has no tooth
  meds: { label: "Meds", Icon: Pill },
  stretch: { label: "Stretch", Icon: PersonStanding },
  focus: { label: "Focus", Icon: Target },
  create: { label: "Create", Icon: Palette },
  grow: { label: "Grow", Icon: Sprout },
  coffee: { label: "Coffee", Icon: Coffee },
  morning: { label: "Morning", Icon: Sun },
};

/**
 * A rounded square in the habit's colour with its icon on top. With no icon it
 * shows the habit's first letter, so a tile is never empty.
 */
export function HabitTile({
  color,
  icon,
  name,
  size = 40,
}: {
  color: HabitColor;
  icon: HabitIconKey | null;
  name: string;
  size?: number;
}) {
  const Glyph = icon ? HABIT_ICONS[icon].Icon : null;
  return (
    <span
      className="tile"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: size >= 56 ? 16 : size >= 40 ? 12 : 10,
        background: `var(--h-${color})`,
      }}
    >
      {Glyph ? (
        <Glyph size={Math.round(size * 0.5)} strokeWidth={1.8} />
      ) : (
        <span className="display" style={{ fontSize: Math.round(size * 0.42) }}>
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}
