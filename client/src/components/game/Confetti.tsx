import { type CSSProperties, useMemo } from 'react';
import type { ThemeId } from '@/types';

interface Props {
  count?: number;
  /** `full`: pieces span the whole width with staggered delays; `center`: pieces start around the middle. */
  spread?: 'full' | 'center';
  /** [min, max] fall duration in seconds. */
  durationRange?: [number, number];
  /** Theme flavor — picks confetti hues from a per-theme palette instead of fully random. */
  palette?: ThemeId;
}

/** Base hues each theme draws its confetti from (0–360). `default` = full rainbow. */
const THEME_HUES: Record<ThemeId, number[] | null> = {
  default: null,
  neon: [180, 300, 160, 280],
  paper: [30, 45, 15, 60],
  space: [240, 270, 210, 290],
  retro: [120, 140, 100],
};

export function Confetti({
  count = 60,
  spread = 'full',
  durationRange = [1.4, 3.4],
  palette = 'default',
}: Props) {
  const [minDuration, maxDuration] = durationRange;
  const hues = THEME_HUES[palette] ?? null;
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `confetti-${i}`,
        style: {
          '--x': `${Math.random() * 200 - 100}vw`,
          '--r': `${Math.random() * 720 - 360}deg`,
          '--d': `${minDuration + Math.random() * (maxDuration - minDuration)}s`,
          '--h': hues
            ? `${hues[Math.floor(Math.random() * hues.length)] + (Math.random() * 20 - 10)}`
            : `${Math.random() * 360}`,
          left: spread === 'full' ? `${Math.random() * 100}%` : `${40 + Math.random() * 20}%`,
          ...(spread === 'full' ? { animationDelay: `${Math.random() * 1.5}s` } : {}),
        },
      })),
    [count, spread, minDuration, maxDuration, hues],
  );

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((piece) => (
        <div key={piece.id} className="confetti-piece" style={piece.style as CSSProperties} />
      ))}
    </div>
  );
}
