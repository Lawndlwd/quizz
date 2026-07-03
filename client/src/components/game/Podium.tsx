import { AvatarDisplay } from '@/components/AvatarPicker';
import { cn } from '@/lib/utils';
import type { FinalLeaderboardEntry } from '@/types';

interface Props {
  leaderboard: FinalLeaderboardEntry[];
  className?: string;
  columnClassName?: string;
}

/** Top-3 podium columns (medal, avatar, name, points, gradient bar). */
export function Podium({ leaderboard, className, columnClassName }: Props) {
  const top3 = leaderboard.slice(0, 3);
  const podiumOrder = [
    { entry: top3[1], medal: '🥈', place: 2, color: '#9ca3af', barH: 132 },
    { entry: top3[0], medal: '🥇', place: 1, color: '#fbbf24', barH: 176 },
    { entry: top3[2], medal: '🥉', place: 3, color: '#cd7c3a', barH: 98 },
  ];

  return (
    <div className={cn('flex w-full max-w-[560px] items-end justify-center gap-3', className)}>
      {podiumOrder.map(({ entry, medal, place, color, barH }, idx) => {
        if (!entry) return <div key={place} className="flex-1" />;
        const isFirst = place === 1;
        return (
          <div
            key={entry.rank}
            className={cn('flex flex-1 flex-col items-center', columnClassName)}
            style={{ animation: `podiumRise 0.5s ease ${idx * 0.12}s both` }}
          >
            <div className="mb-2 px-1 text-center">
              <div className={`mb-1 ${isFirst ? 'text-[2.4rem]' : 'text-[1.9rem]'}`}>{medal}</div>
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
