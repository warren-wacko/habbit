// The Habbit mark: an H built from seven rounded squares, one for each day of the week.
// The bottom-right square is "today" and takes the accent colour; the two faded squares
// complete the 3 x 3 grid. Geometry and colours come from design/.../habbit-logo/LOGO.md.

// [x, y, how solid]: 1 is solid, a number below 1 is faded, "today" is the accent square
const CELLS: [number, number, number | "today"][] = [
  [11, 11, 1],
  [11, 23, 1],
  [11, 35, 1],
  [23, 11, 0.18],
  [23, 23, 1],
  [23, 35, 0.18],
  [35, 11, 1],
  [35, 23, 1],
  [35, 35, "today"],
];

const MARKS = {
  // the primary mark: lime tile, ink squares, violet "today"
  volt: { tile: "#CCF33C", square: "#0E1111", today: "#6B4EFF" },
  // for dark screens such as the login: ink tile, paper squares, lime "today"
  ink: { tile: "#0E1111", square: "#F1F4EE", today: "#CCF33C" },
} as const;

export function LogoMark({
  size = 32,
  variant = "volt",
}: {
  size?: number;
  variant?: keyof typeof MARKS;
}) {
  const c = MARKS[variant];
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
      <rect width="56" height="56" rx="16" fill={c.tile} />
      {CELLS.map(([x, y, kind]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="10"
          height="10"
          rx="3"
          fill={kind === "today" ? c.today : c.square}
          fillOpacity={kind === "today" ? 1 : kind}
        />
      ))}
    </svg>
  );
}

export function Wordmark({
  size = 20,
  markSize,
  variant = "volt",
  className = "",
}: {
  size?: number;
  markSize?: number;
  variant?: keyof typeof MARKS;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={markSize ?? Math.round(size * 1.6)} variant={variant} />
      <span
        className="display"
        style={{ fontSize: size, fontWeight: 900, letterSpacing: "0.01em" }}
      >
        HABBIT
      </span>
    </span>
  );
}
