import { useRef, useState } from 'react';
import { AvatarDisplay } from '@/components/AvatarPicker';
import { useSocketEvent } from '@/hooks/useSocket';
import type { PlayerInfo } from '@/types';

interface FloatingReaction {
  id: number;
  playerId: number;
  emoji: string;
}

/** Joined-player chips with live lobby reactions, on the host lobby and the big screen. */
export function LobbyPlayers({ players }: { players: PlayerInfo[] }) {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const nextId = useRef(0);

  useSocketEvent<{ playerId: number; emoji: string }>('game:reaction', (data) => {
    const id = nextId.current++;
    setReactions((prev) =>
      [...prev, { id, playerId: data.playerId, emoji: data.emoji }].slice(-30),
    );
  });

  return (
    <div className="flex max-w-[820px] flex-wrap justify-center gap-[9px]">
      {players.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Waiting for players to join
          <span className="dots">
            {' '}
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
      ) : (
        players.map((p, i) => (
          <div
            key={p.id}
            className="relative flex items-center gap-2.5 rounded-full border border-border bg-[var(--surface2)] py-2 pl-2 pr-5"
            style={{ animation: `fadeUp .3s ${i * 0.04}s both` }}
          >
            {/* Reactions this player sent float up out of their own chip. */}
            <div
              className="pointer-events-none absolute inset-x-0 -top-2 flex justify-center"
              aria-hidden="true"
            >
              {reactions
                .filter((r) => r.playerId === p.id)
                .map((r) => (
                  <span
                    key={r.id}
                    className="reaction-float"
                    onAnimationEnd={() => setReactions((prev) => prev.filter((x) => x.id !== r.id))}
                  >
                    {r.emoji}
                  </span>
                ))}
            </div>
            <span
              className="inline-flex"
              style={{
                animation: `${i % 2 === 0 ? 'idleBounce' : 'idleWave'} 2.4s ease-in-out ${i * 0.3}s infinite`,
              }}
            >
              <AvatarDisplay avatar={p.avatar} size={40} />
            </span>
            <span className="text-[16px] font-semibold">{p.username}</span>
          </div>
        ))
      )}
    </div>
  );
}
