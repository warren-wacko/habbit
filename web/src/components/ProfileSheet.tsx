"use client";

import { useState } from "react";
import { cleanNickname, initialOf, MAX_NICKNAME, type Me } from "@/lib/profile";
import { useUpdateProfile } from "@/lib/useMe";
import { HABIT_COLORS, HABIT_ICON_KEYS, type HabitColor, type HabitIconKey } from "@/lib/types";
import { Avatar } from "./Avatar";
import { HABIT_ICONS } from "./habitIcons";
import { CheckIcon } from "./icons";
import { Sheet } from "./Sheet";

/** "Edit profile": a nickname and an avatar (colour, and an icon or your initial) */
export function ProfileSheet({
  open,
  onClose,
  me,
}: {
  open: boolean;
  onClose: () => void;
  me: Me;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Edit profile">
      <ProfileForm me={me} done={onClose} />
    </Sheet>
  );
}

function ProfileForm({ me, done }: { me: Me; done: () => void }) {
  const update = useUpdateProfile();
  const [nickname, setNickname] = useState(me.nickname ?? "");
  const [color, setColor] = useState<HabitColor>(me.avatarColor);
  const [icon, setIcon] = useState<HabitIconKey | null>(me.avatarIcon);

  const clean = cleanNickname(nickname);
  const initial = initialOf({ email: me.email, nickname: clean });
  const left = MAX_NICKNAME - nickname.length;

  function save() {
    if (update.isPending) return;
    // send only what changed
    const changes: { nickname?: string | null; avatarIcon?: HabitIconKey | null; avatarColor?: HabitColor } = {};
    if (clean !== me.nickname) changes.nickname = clean;
    if (icon !== me.avatarIcon) changes.avatarIcon = icon;
    if (color !== me.avatarColor) changes.avatarColor = color;
    if (Object.keys(changes).length === 0) return done();
    update.mutate(changes, { onSuccess: done });
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex items-center gap-3.5">
        <Avatar color={color} icon={icon} initial={initial} size={64} />
        <div className="field min-w-0 flex-1">
          <label htmlFor="nickname">Nickname</label>
          <input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={MAX_NICKNAME}
            autoComplete="off"
            placeholder="What should we call you?"
            className="input"
          />
          <span className={`text-xs ${left <= 5 ? "text-danger" : "text-muted"}`} aria-live="polite">
            {left} characters left
          </span>
        </div>
      </div>

      <fieldset>
        <legend className="legend mb-2.5">Colour</legend>
        <div className="grid grid-cols-6 gap-2.5">
          {HABIT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              className="swatch"
              style={{ background: `var(--h-${c})` }}
            >
              <CheckIcon size={18} strokeWidth={2.6} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="legend mb-2.5">Avatar</legend>
        <div
          className="grid grid-cols-6 gap-2"
          style={{ "--hc": `var(--h-${color})` } as React.CSSProperties}
        >
          <button
            type="button"
            aria-label="Use my initial"
            aria-pressed={icon === null}
            onClick={() => setIcon(null)}
            className="icon-pick display text-lg"
          >
            {initial}
          </button>
          {HABIT_ICON_KEYS.map((key) => {
            const { Icon, label } = HABIT_ICONS[key];
            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-pressed={icon === key}
                onClick={() => setIcon(key)}
                className="icon-pick"
              >
                <Icon size={22} strokeWidth={1.8} />
              </button>
            );
          })}
        </div>
      </fieldset>

      {update.isError && (
        <p role="alert" className="alert">
          {update.error.message}
        </p>
      )}

      <button type="submit" className="btn btn-volt" disabled={update.isPending}>
        {update.isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
