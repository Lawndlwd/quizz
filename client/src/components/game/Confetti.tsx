import { type CSSProperties, useMemo } from 'react';

interface Props {
  count?: number;
  /** `full`: pieces span the whole width with staggered delays; `center`: pieces start around the middle. */
  spread?: 'full' | 'center';
  /** [min, max] fall duration in seconds. */
  durationRange?: [number, number];
}

export function Confetti({ count = 60, spread = 'full', durationRange = [1.4, 3.4] }: Props) {
  const [minDuration, maxDuration] = durationRange;
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: `confetti-${i}`,
        style: {
          '--x': `${Math.random() * 200 - 100}vw`,
          '--r': `${Math.random() * 720 - 360}deg`,
          '--d': `${minDuration + Math.random() * (maxDuration - minDuration)}s`,
          '--h': `${Math.random() * 360}`,
          left: spread === 'full' ? `${Math.random() * 100}%` : `${40 + Math.random() * 20}%`,
          ...(spread === 'full' ? { animationDelay: `${Math.random() * 1.5}s` } : {}),
        },
      })),
    [count, spread, minDuration, maxDuration],
  );

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((piece) => (
        <div key={piece.id} className="confetti-piece" style={piece.style as CSSProperties} />
      ))}
    </div>
  );
}
