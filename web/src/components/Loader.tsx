import { LOADER_CYCLE_MS, LOADER_RING, loaderDelays } from "@/lib/loader";

const DELAYS = loaderDelays();

/**
 * The loading animation: the logo's grid of squares with a bright square travelling round
 * the edge. It uses the colour theme's main colour, so it matches the rest of the app.
 * Read aloud as "Loading" by screen readers.
 */
export function Loader({ size = 56, label = "Loading" }: { size?: number; label?: string }) {
  return (
    <span role="status" className="inline-grid place-items-center">
      <svg
        width={size}
        height={size}
        viewBox="0 0 56 56"
        aria-hidden="true"
        className="loader"
        style={{ ["--loader-cycle" as string]: `${LOADER_CYCLE_MS}ms` }}
      >
        <rect width="56" height="56" rx="16" fill="var(--volt)" />
        {LOADER_RING.map(([col, row], i) => (
          <rect
            key={i}
            className="loader-square"
            x={11 + col * 12}
            y={11 + row * 12}
            width="10"
            height="10"
            rx="3"
            fill="var(--on-volt)"
            style={{ animationDelay: `${DELAYS[i]}ms` }}
          />
        ))}
        <rect x="23" y="23" width="10" height="10" rx="3" fill="var(--on-volt)" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
