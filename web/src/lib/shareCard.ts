import { DEFAULT_MESSAGE, messageFor, type PerfectMessageKey } from "./shareMessage";

// Draws the "my day" picture on a canvas. Everything happens in the browser:
// the optional background photo never leaves the device.
//
// Each layout is its own function. They all draw inside a "safe area": on a story, the
// top and bottom of the picture are covered by the app that shows it (the username bar and
// the reply box), so nothing important goes there. Content is spread over the safe area
// instead of piling up at the top.

export type ShareFormat = "story" | "square";
export type ShareLayout = "stats" | "checklist" | "streak" | "ring" | "week" | "heatmap" | "poster";
export type ShareTheme = "ink" | "volt" | "paper";

export const SHARE_FORMATS: Record<ShareFormat, { label: string; w: number; h: number }> = {
  story: { label: "Story", w: 1080, h: 1920 },
  square: { label: "Square", w: 1080, h: 1080 },
};

export const SHARE_LAYOUTS: { key: ShareLayout; label: string }[] = [
  { key: "stats", label: "Stats" },
  { key: "checklist", label: "Checklist" },
  { key: "ring", label: "Ring" },
  { key: "week", label: "Week" },
  { key: "heatmap", label: "Heatmap" },
  { key: "streak", label: "Streak" },
  { key: "poster", label: "Poster" },
];

export const SHARE_THEMES: { key: ShareTheme; label: string; swatch: string }[] = [
  { key: "ink", label: "Ink", swatch: "#0e1111" },
  { key: "volt", label: "Volt", swatch: "#ccf33c" },
  { key: "paper", label: "Paper", swatch: "#ffffff" },
];

type Palette = {
  bg: string;
  fg: string;
  muted: string;
  accent: string; // big numbers that need to stand out
  perfect: string; // a perfect day's fill
  onPerfect: string; // marks drawn on a perfect day's fill
  bar: string; // any other day's bar
  rule: string;
  heat: [string, string, string, string];
  logoTile: string;
  logoBars: string; // the squares of the mark
  logoToday: string; // the "today" square
  solid: string | null; // fills habits with one colour instead of their own (when theirs would vanish)
  onSolid: string;
};

const INK = "#0e1111";
const VOLT = "#ccf33c";

const PALETTES: Record<ShareTheme, Palette> = {
  ink: {
    bg: INK,
    fg: "#f1f4ee",
    muted: "#9aa39e",
    accent: VOLT,
    perfect: VOLT,
    onPerfect: INK,
    bar: "#5c6461",
    rule: "#2a302d",
    heat: ["#232927", "#4a5a1e", "#8db02a", VOLT],
    logoTile: VOLT,
    logoBars: INK,
    logoToday: "#6B4EFF",
    solid: null,
    onSolid: INK,
  },
  volt: {
    bg: VOLT,
    fg: INK,
    muted: "rgba(14,17,17,0.62)",
    accent: INK,
    perfect: INK,
    onPerfect: VOLT,
    bar: "rgba(14,17,17,0.3)",
    rule: "rgba(14,17,17,0.22)",
    heat: ["rgba(14,17,17,0.14)", "rgba(14,17,17,0.34)", "rgba(14,17,17,0.62)", INK],
    logoTile: INK,
    logoBars: "#F1F4EE",
    logoToday: VOLT,
    // a habit in the volt colour would be green on green, so every done habit is ink here
    solid: INK,
    onSolid: VOLT,
  },
  paper: {
    bg: "#ffffff",
    fg: INK,
    muted: "#5c6461",
    accent: INK,
    perfect: VOLT,
    onPerfect: INK,
    bar: "#c9cec6",
    rule: "#e1e4de",
    heat: ["#e7eae3", "#e5f5a8", "#b8db2c", "#7fa10e"],
    logoTile: VOLT,
    logoBars: INK,
    logoToday: "#6B4EFF",
    solid: null,
    onSolid: INK,
  },
};

export type ShareBar = { rate: number | null; perfect: boolean };
export type ShareHabit = {
  name: string;
  color: string; // a CSS colour, resolved from the habit's palette name
  done: boolean;
  detail?: string; // for a habit with a goal: "5/8 glasses"
};

export type ShareProfile = {
  name: string; // the nickname: never the email
  initial: string;
  color: string; // a CSS colour for the avatar circle
};

export type ShareData = {
  dateLabel: string; // "MON 12 OCT"
  done: number;
  total: number;
  streak: number | null; // the overall streak is "as of today", so null for other days
  best: number;
  weekRate: number | null; // 0..1
  bars: ShareBar[]; // the seven days ending on the shared day
  dayLetters: string[]; // "M", "T", ... for those seven days
  heat: (0 | 1 | 2 | 3 | null)[]; // the last 42 days, oldest first; null = future
  heatGrid: (0 | 1 | 2 | 3 | null)[]; // six Monday-first weeks (42 cells); null = not a day yet
  habits: ShareHabit[];
  profile: ShareProfile | null; // shown only when the user turns it on
};

export type ShareFonts = { family: string };

type Opts = {
  layout: ShareLayout;
  theme: ShareTheme;
  format: ShareFormat;
  photo: (CanvasImageSource & { width: number; height: number }) | null;
  message?: PerfectMessageKey; // the Poster's headline on a perfect day
};

// everything a layout needs to draw
type Scene = {
  ctx: CanvasRenderingContext2D;
  data: ShareData;
  p: Palette;
  F: string;
  W: number;
  H: number;
  story: boolean;
  pad: number;
  contentW: number;
  top: number; // the safe area for content: from here...
  bottom: number; // ...to here
  pick: <T>(story: T, square: T) => T;
  message: PerfectMessageKey;
  hasPhoto: boolean; // a photo is the background: dividers would only cut across it
};

// "800 expanded 120px Archivo": the display style is Archivo at width 125
const display = (size: number, family: string) => `800 expanded ${size}px ${family}`;
const body = (weight: number, size: number, family: string) => `${weight} ${size}px ${family}`;

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
}

function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  font: string,
  color: string,
  opts: { align?: CanvasTextAlign; spacing?: number } = {},
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = opts.align ?? "left";
  setSpacing(ctx, opts.spacing ?? 0);
  ctx.fillText(s, x, y);
  setSpacing(ctx, 0);
}

function width(ctx: CanvasRenderingContext2D, s: string, font: string, spacing = 0): number {
  ctx.font = font;
  setSpacing(ctx, spacing);
  const w = ctx.measureText(s).width;
  setSpacing(ctx, 0);
  return w;
}

/**
 * The font size to draw text at so it is no wider than `maxWidth`: `size` when it already fits,
 * smaller when it does not. `measuredWidth` is how wide the text is at `size`.
 */
export function fitFontSize(size: number, measuredWidth: number, maxWidth: number): number {
  if (measuredWidth <= maxWidth || measuredWidth <= 0) return size;
  return Math.max(1, Math.floor((size * maxWidth) / measuredWidth));
}

// small spaced-out capitals, drawn from the top of the text
function caps(
  s: Scene,
  label: string,
  x: number,
  top: number,
  size: number,
  color: string,
  align: CanvasTextAlign = "left",
) {
  text(s.ctx, label.toUpperCase(), x, top + size * 0.78, body(700, size, s.F), color, {
    align,
    spacing: size * 0.14,
  });
}

// big display text, drawn from the top of its digits
function big(s: Scene, label: string, x: number, top: number, size: number, color: string, align: CanvasTextAlign = "left") {
  text(s.ctx, label, x, top + size * 0.76, display(size, s.F), color, { align });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}

// shorten text with an ellipsis until it fits
function fit(ctx: CanvasRenderingContext2D, s: string, maxW: number): string {
  if (ctx.measureText(s).width <= maxW) return s;
  let t = s;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}

/** Vertical positions for stacked sections: spread evenly, then centred in the space */
export function placeSections(top: number, bottom: number, heights: number[], maxGap: number): number[] {
  const sum = heights.reduce((a, b) => a + b, 0);
  const n = heights.length;
  const free = Math.max(0, bottom - top - sum);
  const gap = n > 1 ? Math.min(maxGap, free / (n - 1)) : 0;
  const total = sum + gap * (n - 1);
  let y = top + Math.max(0, (bottom - top - total) / 2);
  return heights.map((h) => {
    const at = y;
    y += h + gap;
    return at;
  });
}

// The seven-day H: seven squares, two faded ones to complete the 3 x 3 grid, and the bottom-right
// square ("today") in its own colour. Same geometry as the SVG in design/.../habbit-logo.
function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, p: Palette) {
  const k = size / 56;
  ctx.fillStyle = p.logoTile;
  roundRect(ctx, x, y, size, size, 16 * k);
  ctx.fill();
  const cells: [number, number, number | "today"][] = [
    [11, 11, 1], [11, 23, 1], [11, 35, 1],
    [23, 11, 0.18], [23, 23, 1], [23, 35, 0.18],
    [35, 11, 1], [35, 23, 1], [35, 35, "today"],
  ];
  for (const [cx, cy, kind] of cells) {
    ctx.globalAlpha = kind === "today" ? 1 : kind;
    ctx.fillStyle = kind === "today" ? p.logoToday : p.logoBars;
    roundRect(ctx, x + cx * k, y + cy * k, 10 * k, 10 * k, 3 * k);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCover(ctx: CanvasRenderingContext2D, img: NonNullable<Opts["photo"]>, w: number, h: number) {
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function checkMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, line: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = line;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.42, cy + r * 0.04);
  ctx.lineTo(cx - r * 0.1, cy + r * 0.36);
  ctx.lineTo(cx + r * 0.46, cy - r * 0.32);
  ctx.stroke();
}

// the fill for a done habit, and what is drawn on it
function doneColors(s: Scene, h: ShareHabit) {
  return { fill: s.p.solid ?? h.color, on: s.p.onSolid };
}

const pctText = (rate: number | null) => (rate === null ? "-" : `${Math.round(rate * 100)}%`);
const streakText = (d: ShareData) => (d.streak === null ? "-" : `${d.streak}d`);

// a row of labelled numbers: each has a small caption over a big value
function statRow(
  s: Scene,
  top: number,
  items: { label: string; value: string; color?: string }[],
  valueSize: number,
  labelSize: number,
) {
  const colW = s.contentW / items.length;
  items.forEach((it, i) => {
    const x = s.pad + i * colW;
    caps(s, it.label, x, top, labelSize, s.p.muted);
    big(s, it.value, x, top + labelSize + s.pick(22, 14), valueSize, it.color ?? s.p.fg);
  });
}

const statRowHeight = (s: Scene, valueSize: number, labelSize: number) =>
  labelSize + s.pick(22, 14) + valueSize * 0.76;

// ---------------------------------------------------------------- layouts

function layoutStats(s: Scene) {
  const { ctx, data, p, pick } = s;
  const bigSize = pick(260, 170);
  const valueSize = pick(104, 70);
  const labelSize = pick(28, 22);
  const chartH = pick(280, 150);
  const rowH = pick(64, 44);
  const headH = labelSize + pick(22, 14) + bigSize * 0.76;
  const statsH = statRowHeight(s, valueSize, labelSize);
  const chartBlockH = chartH + 12;
  const fixed = headH + statsH + chartBlockH;
  const gaps = pick(130, 90);
  const avail = s.bottom - s.top - fixed - gaps;
  const maxRows = Math.max(1, Math.floor(avail / rowH));
  const more = data.habits.length > maxRows;
  const shown = more ? Math.max(1, maxRows - 1) : data.habits.length;
  const listH = (shown + (more ? 1 : 0)) * rowH;

  const [yHead, yStats, yChart, yList] = placeSections(
    s.top,
    s.bottom,
    [headH, statsH, chartBlockH, listH],
    pick(90, 50),
  );

  caps(s, "Habits", s.pad, yHead, labelSize, p.muted);
  big(s, `${data.done}/${data.total}`, s.pad - 8, yHead + labelSize + pick(22, 14), bigSize, p.fg);

  statRow(
    s,
    yStats,
    [
      { label: "Streak", value: streakText(data), color: p.accent },
      { label: "7 days", value: pctText(data.weekRate) },
    ],
    valueSize,
    labelSize,
  );

  // seven bars: perfect days stand out
  const gap = pick(16, 12);
  const bw = (s.contentW - gap * 6) / 7;
  for (let i = 0; i < 7; i++) {
    const bar = data.bars[i];
    const bh = bar?.rate ? Math.max(12, bar.rate * chartH) : 8;
    ctx.fillStyle = bar?.perfect ? p.perfect : p.bar;
    roundRect(ctx, s.pad + i * (bw + gap), yChart + chartH - bh, bw, bh, 10);
    ctx.fill();
  }
  if (!s.hasPhoto) {
    ctx.fillStyle = p.rule;
    ctx.fillRect(s.pad, yChart + chartH + 6, s.contentW, 3);
  }

  // the habits: a colour square and a name, with the amount for habits that have a goal
  const sq = pick(28, 22);
  const font = body(600, pick(40, 30), s.F);
  data.habits.slice(0, shown).forEach((h, i) => {
    const cy = yList + i * rowH + rowH / 2;
    if (h.done) {
      ctx.fillStyle = doneColors(s, h).fill;
      roundRect(ctx, s.pad, cy - sq / 2, sq, sq, 8);
      ctx.fill();
    } else {
      ctx.strokeStyle = p.muted;
      ctx.lineWidth = 3;
      roundRect(ctx, s.pad + 1.5, cy - sq / 2 + 1.5, sq - 3, sq - 3, 7);
      ctx.stroke();
    }
    const detailW = h.detail ? width(ctx, h.detail, body(600, pick(30, 24), s.F)) + 24 : 0;
    ctx.font = font;
    const name = fit(ctx, h.name, s.contentW - sq - 28 - detailW);
    text(ctx, name, s.pad + sq + 24, cy + pick(13, 10), font, h.done ? p.fg : p.muted);
    if (h.detail) {
      text(ctx, h.detail, s.W - s.pad, cy + pick(11, 8), body(600, pick(30, 24), s.F), p.muted, { align: "right" });
    }
  });
  if (more) {
    text(ctx, `+${data.habits.length - shown} more`, s.pad, yList + shown * rowH + rowH / 2 + 10, body(600, pick(34, 26), s.F), p.muted);
  }
}

function layoutChecklist(s: Scene) {
  const { ctx, data, p, pick } = s;
  const bigSize = pick(210, 140);
  const labelSize = pick(28, 22);
  const headH = labelSize + pick(22, 14) + bigSize * 0.76;
  const perfect = data.total > 0 && data.done === data.total;

  const gap = pick(18, 10);
  const avail = s.bottom - s.top - headH - pick(60, 36);
  // rows grow to fill the space when there are few habits, but stay within a sensible size
  const idealRow = Math.min(pick(150, 96), Math.max(pick(96, 64), (avail + gap) / Math.max(1, data.habits.length) - gap));
  const rowH = Math.round(idealRow);
  const fits = Math.max(1, Math.floor((avail + gap) / (rowH + gap)));
  const more = data.habits.length > fits;
  const shown = more ? Math.max(1, fits - 1) : data.habits.length;
  const listH = shown * rowH + Math.max(0, shown - 1) * gap + (more ? pick(64, 44) : 0);

  const [yHead, yList] = placeSections(s.top, s.bottom, [headH, listH], pick(60, 36));

  caps(s, "Done today", s.pad, yHead, labelSize, p.muted);
  big(s, `${data.done}/${data.total}`, s.pad - 6, yHead + labelSize + pick(22, 14), bigSize, p.fg);
  if (perfect) {
    const label = "PERFECT DAY";
    const lf = body(800, pick(30, 24), s.F);
    const tw = width(ctx, label, lf, 4);
    const ph = pick(48, 38);
    // level with the "Done today" label, top right: that row is short, so the pill can never
    // reach the big number below it (beside the number there is no room for a long total)
    const py = yHead + labelSize * 0.4 - ph / 2;
    ctx.fillStyle = p.perfect;
    roundRect(ctx, s.W - s.pad - tw - 56, py, tw + 56, ph, ph / 2);
    ctx.fill();
    text(ctx, label, s.W - s.pad - tw - 28, py + ph * 0.66, lf, p.onPerfect, { spacing: 4 });
  }

  data.habits.slice(0, shown).forEach((h, i) => {
    const y = yList + i * (rowH + gap);
    const colors = doneColors(s, h);
    if (h.done) {
      ctx.fillStyle = colors.fill;
      roundRect(ctx, s.pad, y, s.contentW, rowH, rowH * 0.3);
      ctx.fill();
    } else {
      ctx.strokeStyle = p.rule === "#2a302d" ? "#3a423e" : p.muted;
      ctx.lineWidth = 3;
      roundRect(ctx, s.pad + 1.5, y + 1.5, s.contentW - 3, rowH - 3, rowH * 0.3);
      ctx.stroke();
    }
    const r = rowH * 0.24;
    const cx = s.pad + rowH * 0.5;
    const cy = y + rowH / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    if (h.done) {
      ctx.fillStyle = p.solid ? VOLT : INK;
      ctx.fill();
      checkMark(ctx, cx, cy, r, p.solid ? INK : VOLT, 6);
    } else {
      ctx.strokeStyle = p.muted;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    const font = body(700, pick(44, 32), s.F);
    const dfont = body(600, pick(32, 24), s.F);
    const detailW = h.detail ? width(ctx, h.detail, dfont) + 28 : 0;
    ctx.font = font;
    text(
      ctx,
      fit(ctx, h.name, s.contentW - rowH - 40 - detailW),
      s.pad + rowH + 4,
      cy + pick(15, 11),
      font,
      h.done ? colors.on : p.fg,
    );
    if (h.detail) {
      text(ctx, h.detail, s.W - s.pad - 30, cy + pick(11, 8), dfont, h.done ? colors.on : p.muted, { align: "right" });
    }
  });
  if (more) {
    text(ctx, `+${data.habits.length - shown} more`, s.pad + 8, yList + shown * (rowH + gap) + pick(30, 22), body(600, pick(36, 28), s.F), p.muted);
  }
}

function layoutRing(s: Scene) {
  const { ctx, data, p, pick } = s;
  const D = pick(600, 360);
  const stroke = pick(70, 44);
  const perfect = data.total > 0 && data.done === data.total;
  const pillH = pick(62, 46);
  const ringBlockH = D + (perfect ? pick(34, 20) + pillH : 0);
  const valueSize = pick(70, 48);
  const labelSize = pick(24, 19);
  const statsH = statRowHeight(s, valueSize, labelSize);

  const chipFont = body(700, pick(36, 26), s.F);
  const chipH = pick(78, 54);
  const chipGap = pick(14, 10);
  const chipPad = pick(30, 22);
  const avail = s.bottom - s.top - ringBlockH - statsH - pick(120, 60);
  const maxRows = Math.max(1, Math.floor((avail + chipGap) / (chipH + chipGap)));

  // flow the chips onto rows
  const rows: { label: string; w: number; h: ShareHabit | null }[][] = [[]];
  let rowW = 0;
  const lay = (label: string, h: ShareHabit | null) => {
    ctx.font = chipFont;
    const w = Math.min(s.contentW, ctx.measureText(fit(ctx, label, s.contentW - chipPad * 2 - 30)).width + chipPad * 2 + (h ? 30 : 0));
    if (rowW + w > s.contentW && rows[rows.length - 1].length > 0) {
      rows.push([]);
      rowW = 0;
    }
    rows[rows.length - 1].push({ label: fit(ctx, label, s.contentW - chipPad * 2 - 30), w, h });
    rowW += w + chipGap;
  };
  data.habits.forEach((h) => lay(h.name, h));
  let hidden = 0;
  if (rows.length > maxRows) {
    const kept = rows.slice(0, maxRows);
    hidden = rows.slice(maxRows).reduce((n, r) => n + r.length, 0);
    rows.length = 0;
    rows.push(...kept);
  }
  const chipsH = rows.length * chipH + (rows.length - 1) * chipGap + (hidden ? pick(56, 40) : 0);

  const [yRing, yStats, yChips] = placeSections(s.top, s.bottom, [ringBlockH, statsH, chipsH], pick(80, 44));

  // the ring
  const cx = s.W / 2;
  const cy = yRing + D / 2;
  const r = (D - stroke) / 2;
  ctx.lineCap = "round";
  ctx.lineWidth = stroke;
  ctx.strokeStyle = p.heat[0];
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const progress = data.total ? data.done / data.total : 0;
  if (progress > 0) {
    ctx.strokeStyle = p.perfect;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
  }
  // a long total such as 10/10 must stay inside the ring, so it shrinks to fit (3/3 does not)
  const score = `${data.done}/${data.total}`;
  const baseSize = D * 0.28;
  const scoreSize = fitFontSize(baseSize, width(ctx, score, display(baseSize, s.F)), (D - stroke * 2) * 0.84);
  big(s, score, cx, cy - D * 0.15 + (baseSize - scoreSize) * 0.38, scoreSize, p.fg, "center");
  caps(s, "done", cx, cy + D * 0.13, pick(30, 22), p.muted, "center");
  if (perfect) {
    const label = "PERFECT DAY";
    const lf = body(800, pick(28, 22), s.F);
    const tw = width(ctx, label, lf, 4);
    const px = cx - (tw + 56) / 2;
    const py = yRing + D + pick(34, 20);
    ctx.fillStyle = p.perfect;
    roundRect(ctx, px, py, tw + 56, pillH, pillH / 2);
    ctx.fill();
    text(ctx, label, px + 28, py + pillH * 0.66, lf, p.onPerfect, { spacing: 4 });
  }

  // stats under the ring, centred in three columns
  const colW = s.contentW / 3;
  [
    { label: "Streak", value: streakText(data), color: p.accent },
    { label: "7 days", value: pctText(data.weekRate), color: p.fg },
    { label: "Best", value: `${data.best}d`, color: p.fg },
  ].forEach((it, i) => {
    const x = s.pad + colW * i + colW / 2;
    caps(s, it.label, x, yStats, labelSize, p.muted, "center");
    big(s, it.value, x, yStats + labelSize + pick(22, 14), valueSize, it.color, "center");
  });

  // habit chips
  rows.forEach((row, ri) => {
    const rowTotal = row.reduce((n, c) => n + c.w, 0) + chipGap * (row.length - 1);
    let x = s.pad + (s.contentW - rowTotal) / 2;
    const y = yChips + ri * (chipH + chipGap);
    for (const c of row) {
      const done = c.h?.done;
      if (done) {
        ctx.fillStyle = c.h ? doneColors(s, c.h).fill : p.perfect;
        roundRect(ctx, x, y, c.w, chipH, chipH / 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = p.rule === "#2a302d" ? "#3a423e" : p.muted;
        ctx.lineWidth = 3;
        roundRect(ctx, x + 1.5, y + 1.5, c.w - 3, chipH - 3, chipH / 2);
        ctx.stroke();
      }
      text(ctx, c.label, x + chipPad + (c.h ? 15 : 0), y + chipH / 2 + pick(13, 9), chipFont, done && c.h ? doneColors(s, c.h).on : p.fg);
      x += c.w + chipGap;
    }
  });
  if (hidden) {
    text(ctx, `+${hidden} more`, s.W / 2, yChips + rows.length * (chipH + chipGap) + pick(24, 18), body(600, pick(32, 24), s.F), p.muted, { align: "center" });
  }
}

function layoutWeek(s: Scene) {
  const { ctx, data, p, pick } = s;
  const bigSize = pick(250, 160);
  const labelSize = pick(28, 22);
  const headH = labelSize + pick(22, 14) + bigSize * 0.76 + pick(26, 16) + pick(34, 26);
  const gap = pick(14, 10);
  const tileW = (s.contentW - gap * 6) / 7;
  const tileH = pick(300, 170);
  const perfectDays = data.bars.filter((b) => b.perfect).length;
  const valueSize = pick(104, 70);
  const statsH = statRowHeight(s, valueSize, labelSize);

  const [yHead, yTiles, yStats] = placeSections(s.top, s.bottom, [headH, tileH + pick(60, 40), statsH], pick(110, 50));

  caps(s, "This week", s.pad, yHead, labelSize, p.muted);
  big(s, pctText(data.weekRate), s.pad - 8, yHead + labelSize + pick(22, 14), bigSize, p.fg);
  text(
    ctx,
    "of your habits done",
    s.pad,
    yHead + labelSize + pick(22, 14) + bigSize * 0.76 + pick(26, 16) + pick(28, 22),
    body(600, pick(34, 26), s.F),
    p.muted,
  );

  for (let i = 0; i < 7; i++) {
    const bar = data.bars[i] ?? { rate: null, perfect: false };
    const x = s.pad + i * (tileW + gap);
    const y = yTiles + pick(50, 34);
    // day letter above the tile
    caps(s, data.dayLetters[i] ?? "", x + tileW / 2, yTiles, pick(28, 22), i === 6 ? p.fg : p.muted, "center");
    // the tile, with a fill that rises with the day's completion
    ctx.fillStyle = p.heat[0];
    roundRect(ctx, x, y, tileW, tileH, tileW * 0.34);
    ctx.fill();
    if (bar.rate) {
      const fh = Math.max(tileW * 0.34, bar.rate * tileH);
      ctx.save();
      roundRect(ctx, x, y, tileW, tileH, tileW * 0.34);
      ctx.clip();
      ctx.fillStyle = bar.perfect ? p.perfect : p.bar;
      ctx.fillRect(x, y + tileH - fh, tileW, fh);
      ctx.restore();
    }
    if (bar.perfect) checkMark(ctx, x + tileW / 2, y + tileH / 2, tileW * 0.34, p.onPerfect, pick(9, 6));
    if (i === 6) {
      ctx.strokeStyle = p.fg;
      ctx.lineWidth = pick(5, 4);
      roundRect(ctx, x - 5, y - 5, tileW + 10, tileH + 10, tileW * 0.34 + 5);
      ctx.stroke();
    }
  }

  statRow(
    s,
    yStats,
    [
      { label: "Perfect days", value: `${perfectDays}/7`, color: p.accent },
      { label: "Streak", value: streakText(data) },
    ],
    valueSize,
    labelSize,
  );
}

function layoutHeatmap(s: Scene) {
  const { ctx, data, p, pick } = s;
  const bigSize = pick(180, 110);
  const labelSize = pick(28, 22);
  const headH = labelSize + pick(22, 14) + bigSize * 0.76;
  const gap = pick(12, 8);
  const cell = Math.min((s.contentW - gap * 6) / 7, pick(100, 62));
  const gridW = cell * 7 + gap * 6;
  const lettersH = pick(40, 30);
  const gridH = cell * 6 + gap * 5;
  const valueSize = pick(80, 54);
  const statsH = statRowHeight(s, valueSize, pick(24, 19));

  const [yHead, yGrid, yStats] = placeSections(s.top, s.bottom, [headH, lettersH + gridH, statsH], pick(80, 40));

  caps(s, "Day streak", s.pad, yHead, labelSize, p.muted);
  big(s, data.streak === null ? "-" : String(data.streak), s.pad - 8, yHead + labelSize + pick(22, 14), bigSize, p.accent);

  // weekday letters over the columns, then six weeks of squares
  const x0 = s.pad + (s.contentW - gridW) / 2;
  ["M", "T", "W", "T", "F", "S", "S"].forEach((l, i) => caps(s, l, x0 + i * (cell + gap) + cell / 2, yGrid, pick(24, 18), p.muted, "center"));
  const lastDay = data.heatGrid.reduce((last, v, i) => (v === null ? last : i), -1);
  data.heatGrid.forEach((level, i) => {
    const cx = x0 + (i % 7) * (cell + gap);
    const cy = yGrid + lettersH + Math.floor(i / 7) * (cell + gap);
    if (level === null) {
      ctx.strokeStyle = p.rule;
      ctx.lineWidth = 2;
      roundRect(ctx, cx + 1, cy + 1, cell - 2, cell - 2, cell * 0.26);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = p.heat[level];
    roundRect(ctx, cx, cy, cell, cell, cell * 0.26);
    ctx.fill();
    if (i === lastDay) {
      ctx.strokeStyle = p.fg;
      ctx.lineWidth = pick(5, 4);
      roundRect(ctx, cx - 4, cy - 4, cell + 8, cell + 8, cell * 0.26 + 4);
      ctx.stroke();
    }
  });

  statRow(
    s,
    yStats,
    [
      { label: "Best streak", value: `${data.best}d` },
      { label: "7 days", value: pctText(data.weekRate) },
    ],
    valueSize,
    pick(24, 19),
  );
}

function layoutStreak(s: Scene) {
  const { ctx, data, p, pick } = s;
  const bigSize = pick(520, 300);
  const labelSize = pick(30, 22);
  const headH = labelSize + pick(22, 14) + bigSize * 0.76;
  const valueSize = pick(84, 60);
  const statsH = statRowHeight(s, valueSize, pick(26, 20));
  const cols = 14;
  const gap = pick(10, 8);
  const cell = (s.contentW - gap * (cols - 1)) / cols;
  const gridH = cell * 3 + gap * 2;
  const gridBlockH = pick(40, 30) + gridH;

  const [yHead, yStats, yGrid] = placeSections(s.top, s.bottom, [headH, statsH, gridBlockH], pick(100, 50));

  caps(s, "Day streak", s.pad, yHead, labelSize, p.muted);
  big(s, data.streak === null ? "-" : String(data.streak), s.pad - 14, yHead + labelSize + pick(22, 14), bigSize, p.accent);

  statRow(
    s,
    yStats,
    [
      { label: "Best streak", value: `${data.best}d` },
      { label: "7 days", value: pctText(data.weekRate) },
    ],
    valueSize,
    pick(26, 20),
  );

  caps(s, "Last six weeks", s.pad, yGrid, pick(24, 19), p.muted);
  data.heat.slice(-cols * 3).forEach((level, i) => {
    const cx = s.pad + (i % cols) * (cell + gap);
    const cy = yGrid + pick(40, 30) + Math.floor(i / cols) * (cell + gap);
    if (level === null) {
      ctx.strokeStyle = p.rule;
      ctx.lineWidth = 2;
      roundRect(ctx, cx + 1, cy + 1, cell - 2, cell - 2, 8);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = p.heat[level];
    roundRect(ctx, cx, cy, cell, cell, 8);
    ctx.fill();
  });
}

function layoutPoster(s: Scene) {
  const { ctx, data, p, pick } = s;
  const perfect = data.total > 0 && data.done === data.total;
  // the headline, as lines of [text, colour] pieces
  type Piece = [string, string];
  const lines: Piece[][] =
    data.total === 0
      ? [[["Nothing", p.fg]], [["on today.", p.accent]]]
      : perfect
        ? // the user's chosen message: the last line stands out in the accent colour
          messageFor(s.message).lines.map((t, i, all): Piece[] => [[t, i === all.length - 1 ? p.accent : p.fg]])
        : [
            [[String(data.done), p.accent], [` of ${data.total}`, p.fg]],
            [["habits", p.fg]],
            [["done.", p.fg]],
          ];

  // the biggest size at which the widest line still fits
  let size = pick(280, 190);
  const lineWidth = (l: Piece[], sz: number) => l.reduce((n, [t]) => n + width(ctx, t, display(sz, s.F)), 0);
  while (size > 60 && Math.max(...lines.map((l) => lineWidth(l, size))) > s.contentW) size -= 6;
  const lead = size * 1.02;
  const blockH = lines.length * lead;

  const valueSize = pick(70, 48);
  const labelSize = pick(24, 19);
  const statsH = statRowHeight(s, valueSize, labelSize) + pick(40, 24);

  const [yBlock, yStats] = placeSections(s.top, s.bottom, [blockH, statsH], pick(120, 60));

  lines.forEach((l, i) => {
    let x = s.pad - 6;
    for (const [t, color] of l) {
      big(s, t, x, yBlock + i * lead, size, color);
      x += width(ctx, t, display(size, s.F));
    }
  });

  if (!s.hasPhoto) {
    ctx.fillStyle = p.rule;
    ctx.fillRect(s.pad, yStats, s.contentW, 3);
  }
  statRow(
    s,
    yStats + pick(40, 24),
    [
      { label: "Streak", value: streakText(data), color: p.accent },
      { label: "7 days", value: pctText(data.weekRate) },
    ],
    valueSize,
    labelSize,
  );
}

const LAYOUTS: Record<ShareLayout, (s: Scene) => void> = {
  stats: layoutStats,
  checklist: layoutChecklist,
  streak: layoutStreak,
  ring: layoutRing,
  week: layoutWeek,
  heatmap: layoutHeatmap,
  poster: layoutPoster,
};

// ---------------------------------------------------------------- the picture

export function drawShareCard(canvas: HTMLCanvasElement, data: ShareData, opts: Opts, fonts: ShareFonts) {
  const { w: W, h: H } = SHARE_FORMATS[opts.format];
  const story = opts.format === "story";
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const F = fonts.family;

  // a photo is always shown with the dark theme's light text on a dark scrim
  const p = opts.photo ? PALETTES.ink : PALETTES[opts.theme];
  const pick = <T,>(a: T, b: T) => (story ? a : b);
  const pad = pick(80, 70);

  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);
  if (opts.photo) {
    drawCover(ctx, opts.photo, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "rgba(14,17,17,0.62)");
    g.addColorStop(0.5, "rgba(14,17,17,0.5)");
    g.addColorStop(1, "rgba(14,17,17,0.86)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.textBaseline = "alphabetic";

  // ---- header: logo and wordmark (or the user's avatar and name), and the date.
  // On a story it sits below the area the app that shows it covers.
  const headTop = pick(240, pad);
  const logo = pick(60, 52);
  if (data.profile) {
    ctx.fillStyle = data.profile.color;
    ctx.beginPath();
    ctx.arc(pad + logo / 2, headTop + logo / 2, logo / 2, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, data.profile.initial, pad + logo / 2, headTop + logo * 0.68, display(logo * 0.46, F), INK, { align: "center" });
    ctx.font = display(pick(38, 32), F);
    const maxName = W - pad * 2 - logo - 18 - 250;
    text(ctx, fit(ctx, data.profile.name, maxName), pad + logo + 18, headTop + logo * 0.72, display(pick(38, 32), F), p.fg);
  } else {
    drawLogo(ctx, pad, headTop, logo, p);
    text(ctx, "HABBIT", pad + logo + 18, headTop + logo * 0.72, display(pick(40, 34), F), p.fg);
  }
  text(ctx, data.dateLabel.toUpperCase(), W - pad, headTop + logo * 0.7, body(700, pick(28, 24), F), p.muted, {
    align: "right",
    spacing: pick(28, 24) * 0.14,
  });

  const top = headTop + logo + pick(90, 56);
  const bottom = story ? H - 400 : H - pad;

  const scene: Scene = {
    ctx,
    data,
    p,
    F,
    W,
    H,
    story,
    pad,
    contentW: W - 2 * pad,
    top,
    bottom,
    pick,
    message: opts.message ?? DEFAULT_MESSAGE,
    hasPhoto: !!opts.photo,
  };
  LAYOUTS[opts.layout](scene);

  // footer (story only; the square has no spare room), above the area the app covers
  if (story) {
    text(ctx, "Made with Habbit", W / 2, H - 345, body(600, 30, F), p.muted, { align: "center" });
  }
}
