import { test } from "node:test";
import assert from "node:assert/strict";
import { HABIT_COLORS, HABIT_ICON_KEYS } from "./types";
import { normalizeColor, normalizeIcon } from "./legacy";

test("new colour names pass through unchanged", () => {
  for (const c of HABIT_COLORS) assert.equal(normalizeColor(c), c);
});

test("old colour names map to the nearest new colour", () => {
  assert.equal(normalizeColor("yellow"), "volt");
  assert.equal(normalizeColor("mint"), "aqua");
  assert.equal(normalizeColor("pink"), "rose");
  assert.equal(normalizeColor("coral"), "rose");
  assert.equal(normalizeColor("sky"), "sky");
  assert.equal(normalizeColor("violet"), "violet");
});

test("anything unknown falls back to volt", () => {
  assert.equal(normalizeColor("chartreuse"), "volt");
  assert.equal(normalizeColor(""), "volt");
  assert.equal(normalizeColor(null), "volt");
});

test("icon keys pass through unchanged", () => {
  for (const k of HABIT_ICON_KEYS) assert.equal(normalizeIcon(k), k);
});

test("every old emoji maps to the key the design says it replaces", () => {
  const expected: Record<string, string> = {
    "🏃": "run", "💧": "water", "📚": "read", "🧘": "meditate", "💪": "strength",
    "🥗": "food", "😴": "sleep", "✍️": "journal", "🎸": "music", "🧹": "tidy",
    "🦷": "teeth", "💊": "meds", "🚶": "stretch", "🧠": "focus", "🎨": "create",
    "🌱": "grow", "☕": "coffee", "🌞": "morning",
  };
  for (const [emoji, key] of Object.entries(expected)) {
    assert.equal(normalizeIcon(emoji), key, emoji);
  }
  assert.equal(Object.keys(expected).length, HABIT_ICON_KEYS.length);
});

test("no icon, an empty icon and an unknown icon all become null", () => {
  assert.equal(normalizeIcon(null), null);
  assert.equal(normalizeIcon(undefined), null);
  assert.equal(normalizeIcon(""), null);
  assert.equal(normalizeIcon("🤷"), null);
});
