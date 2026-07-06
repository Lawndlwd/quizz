import { Flame } from 'lucide-react';

interface Props {
  streak: number;
}

/**
 * Persistent corner flame that grows with the player's consecutive-correct
 * streak. Hidden below 2. Three visual tiers escalate size/glow; the badge is
 * keyed on `streak` by its parent so it re-pops on every increment.
 */
export function StreakBadge({ streak }: Props) {
  if (streak < 2) return null;

  // Tier scales size + glow with the streak length.
  const tier = streak >= 7 ? 3 : streak >= 4 ? 2 : 1;
  const scale = tier === 3 ? 1.35 : tier === 2 ? 1.15 : 1;
  const glow = tier === 3 ? 16 : tier === 2 ? 9 : 4;
  const flicker = tier === 3 ? 0.5 : tier === 2 ? 0.8 : 1.2;

  return (
    <div
      className="streak-badge"
      style={{
        transform: `scale(${scale})`,
        filter: `drop-shadow(0 0 ${glow}px var(--warn))`,
      }}
    >
      <Flame
        size={18}
        className="streak-flame"
        style={{ animationDuration: `${flicker}s` }}
      />
      <span className="streak-count">{streak}</span>
    </div>
  );
}
