import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { AvatarDisplay } from '@/components/AvatarPicker';
import { MedalIcon } from '@/components/game/MedalIcon';
import { sound } from '@/lib/sound';
import { cn } from '@/lib/utils';
import type { FinalLeaderboardEntry } from '@/types';

interface Props {
  leaderboard: FinalLeaderboardEntry[];
  className?: string;
  columnClassName?: string;
  /** Reveal 3rd → 2nd → (drumroll) → 1st in sequence, with sound. */
  sequenced?: boolean;
  /** Fired once the 1st-place reveal lands (end of the sequence). */
  onSequenceEnd?: () => void;
}

/**
 * Stage timeline (sequenced mode): 0 nothing → 1 reveal 3rd → 2 reveal 2nd →
 * 3 drumroll pause → 4 reveal 1st (+ fanfare). A place is shown once the stage
 * reaches its threshold; earlier stages render a "?" pedestal so layout is stable.
 */
const REVEAL_STAGE: Record<number, number> = { 3: 1, 2: 2, 1: 4 };

/** Top-3 podium columns (medal, avatar, name, points, gradient bar). */
export function Podium({
  leaderboard,
  className,
  columnClassName,
  sequenced = false,
  onSequenceEnd,
}: Props) {
  const top3 = leaderboard.slice(0, 3);
  const podiumOrder = [
    { entry: top3[1], place: 2, color: '#9ca3af', barH: 132 },
    { entry: top3[0], place: 1, color: '#fbbf24', barH: 176 },
    { entry: top3[2], place: 3, color: '#cd7c3a', barH: 98 },
  ];

  const [stage, setStage] = useState(sequenced ? 0 : 4);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const endedRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per mount; onSequenceEnd is invoked through a guard
  useEffect(() => {
    if (!sequenced) return;
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
    at(800, () => setStage(1));
    at(2000, () => setStage(2));
    at(2600, () => {
      setStage(3);
      sound.play('drumroll');
    });
    at(4600, () => {
      sound.stop('drumroll');
      sound.play('fanfare');
      setStage(4);
      if (!endedRef.current) {
        endedRef.current = true;
        onSequenceEnd?.();
      }
    });
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      sound.stop('drumroll');
    };
  }, [sequenced]);

  /** Skip: jump straight to the winner reveal. */
  function skip() {
    if (!sequenced || stage >= 4) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    sound.stop('drumroll');
    sound.play('fanfare');
    setStage(4);
    if (!endedRef.current) {
      endedRef.current = true;
      onSequenceEnd?.();
    }
  }

  return (
    <div
      className={cn('flex w-full max-w-[560px] items-end justify-center gap-3', className)}
      {...(sequenced && stage < 4
        ? {
            role: 'button',
            tabIndex: 0,
            title: 'Tap to skip',
            onClick: skip,
            onKeyDown: (e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') skip();
            },
          }
        : {})}
    >
      {podiumOrder.map(({ entry, place, color, barH }, idx) => {
        if (!entry) return <div key={place} className="flex-1" />;
        const isFirst = place === 1;
        const revealed = stage >= REVEAL_STAGE[place];
        return (
          <div
            key={entry.rank}
            className={cn('flex flex-1 flex-col items-center', columnClassName)}
            style={
              sequenced ? undefined : { animation: `podiumRise 0.5s ease ${idx * 0.12}s both` }
            }
          >
            {revealed ? (
              <div
                className="mb-2 px-1 text-center"
                style={sequenced ? { animation: 'podiumRise 0.5s ease both' } : undefined}
              >
                <div className="mb-1 flex justify-center">
                  <MedalIcon place={place} className="size-10" />
                </div>
                <AvatarDisplay
                  avatar={entry.avatar}
                  size={isFirst ? 68 : 56}
                  style={{
                    border: `3px solid ${color}`,
                    marginBottom: 6,
                    ...(isFirst ? { boxShadow: '0 0 26px rgba(251,191,36,.4)' } : {}),
                  }}
                />
                <div
                  className={`mb-1 break-words font-extrabold leading-tight text-foreground ${isFirst ? 'text-[1.05rem]' : 'text-[0.94rem]'}`}
                >
                  {entry.username}
                </div>
                <div
                  className={`font-extrabold ${isFirst ? 'text-[0.88rem]' : 'text-[0.8rem]'}`}
                  style={{ color }}
                >
                  {entry.totalScore.toLocaleString()} pts
                </div>
              </div>
            ) : (
              <div className="mb-2 flex h-[136px] items-center justify-center px-1 text-4xl font-black text-muted-foreground">
                ?
              </div>
            )}
            <div
              className={`flex w-full items-center justify-center rounded-t-[14px] font-black ${isFirst ? 'text-[2.4rem]' : 'text-[1.9rem]'}`}
              style={{
                height: barH,
                background: `linear-gradient(180deg, ${color}, ${color}bb)`,
                color: place === 1 ? '#0b0b18' : '#fff',
              }}
            >
              {place}
            </div>
          </div>
        );
      })}
    </div>
  );
}
