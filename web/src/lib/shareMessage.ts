// The headline the Poster layout shows on a perfect day. The user picks one in the Share sheet.

export type PerfectMessageKey = "locked" | "untouchable" | "different" | "zero" | "perfect";

export type PerfectMessage = {
  key: PerfectMessageKey;
  label: string; // what the picker button says
  lines: string[]; // how the headline breaks over the poster, one or two lines
};

export const PERFECT_MESSAGES: PerfectMessage[] = [
  { key: "locked", label: "Locked in.", lines: ["Locked", "in."] },
  { key: "untouchable", label: "Untouchable.", lines: ["Untouchable."] },
  { key: "different", label: "Built different.", lines: ["Built", "different."] },
  { key: "zero", label: "Zero days off.", lines: ["Zero days", "off."] },
  { key: "perfect", label: "Perfect day.", lines: ["Perfect", "day."] },
];

export const DEFAULT_MESSAGE: PerfectMessageKey = "locked";

const STORAGE_KEY = "habbit-share-message";

export function isMessageKey(value: unknown): value is PerfectMessageKey {
  return PERFECT_MESSAGES.some((m) => m.key === value);
}

export function messageFor(key: PerfectMessageKey): PerfectMessage {
  return PERFECT_MESSAGES.find((m) => m.key === key) ?? PERFECT_MESSAGES[0];
}

/** The message picked last time on this device, or the default */
export function readStoredMessage(): PerfectMessageKey {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isMessageKey(value) ? value : DEFAULT_MESSAGE;
  } catch {
    return DEFAULT_MESSAGE; // storage can be blocked in private windows
  }
}

export function storeMessage(key: PerfectMessageKey): void {
  try {
    localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // the choice still applies for this visit
  }
}
