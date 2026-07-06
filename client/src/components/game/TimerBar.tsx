import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { sound } from '@/lib/sound';

interface Props {
  timeLeft: number;
  /** Total question time, used to compute the fill percentage. */
  totalSec: number;
  /** Layout extras for the row (margins, gap). */
  className?: string;
  /** Suppress the last-5-seconds tick sound (e.g. on a second device in the room). */
  silent?: boolean;
}

/**
 * Countdown bar + number row shared by the host question view and the player
 * question screen. Number color: default above 50% time left, `warn` between
 * 25–50%, `danger` below 25%; pulses during the last 5 seconds.
 */
export function TimerBar({ timeLeft, totalSec, className, silent }: Props) {
  useEffect(() => {
    if (!silent && timeLeft <= 5 && timeLeft > 0) sound.play('tick');
  }, [timeLeft, silent]);

  const pct = Math.max(0, (timeLeft / totalSec) * 100);
  const numClass = pct > 50 ? '' : pct > 25 ? 'warn' : 'danger';
  return (
    <div className={cn('flex items-center', className)}>
      <div className="timer-bar">
        <div className="timer-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('timer-num', numClass, timeLeft <= 5 && 'pulsing')}>{timeLeft}</span>
    </div>
  );
}
