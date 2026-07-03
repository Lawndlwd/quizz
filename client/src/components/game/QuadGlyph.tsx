/**
 * Color-Quadrants answer glyphs as SVG (not unicode) so every shape renders at
 * an identical visual size — the unicode ▲◆●■ have wildly different metrics.
 * Index-mapped: 0 triangle · 1 diamond · 2 circle · 3 square (wraps for >4).
 */
interface Props {
  index: number;
  size?: number;
  className?: string;
}

export function QuadGlyph({ index, size = 24, className }: Props) {
  const shape = index % 4;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {shape === 0 && <polygon points="12,4.5 20,18.5 4,18.5" />}
      {shape === 1 && <polygon points="12,3 20.5,12 12,21 3.5,12" />}
      {shape === 2 && <circle cx="12" cy="12" r="8" />}
      {shape === 3 && <rect x="5" y="5" width="14" height="14" rx="2.5" />}
    </svg>
  );
}
