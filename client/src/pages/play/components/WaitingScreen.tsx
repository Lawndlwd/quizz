import { useRef, useState } from 'react';
import { QuizIntroCard } from '@/components/game/QuizIntroCard';
import { PageCenter } from '@/components/layout';
import { getSocket } from '@/hooks/useSocket';
import type { QuizIntro } from '@/types';
import { AvatarDisplay } from '../../../components/AvatarPicker';

/** Must match the server-side allowlist in socket/index.ts. */
const REACTIONS = ['👍', '😂', '🔥', '❤️', '🎉', '😮'];
const REACTION_COOLDOWN_MS = 1500;

interface Props {
  username: string;
  avatar: string;
  reconnecting?: boolean;
  intro?: QuizIntro | null;
  sessionId: number;
  playerId: number;
}

export function WaitingScreen({
  username,
  avatar,
  reconnecting,
  intro,
  sessionId,
  playerId,
}: Props) {
  const title = intro ? intro.title : reconnecting ? 'Welcome back!' : 'Get ready!';

  const [cooling, setCooling] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function sendReaction(emoji: string) {
    if (cooling || !sessionId || !playerId) return;
    getSocket().emit('player:reaction', { sessionId, playerId, emoji });
    setCooling(true);
    cooldownTimer.current = setTimeout(() => setCooling(false), REACTION_COOLDOWN_MS);
  }

  return (
    <PageCenter>
      <div className="mx-auto w-full max-w-[820px] px-4 py-6">
        <QuizIntroCard
          intro={intro}
          title={title}
          layout="grid"
          typesHeading="What to expect"
          footer={
            /* Pinned to the bottom of the right column */
            <div className="mt-auto pt-6">
              <div className="mb-4 h-px bg-border" />
              <div className="flex items-center gap-3">
                <AvatarDisplay
                  avatar={avatar}
                  size={44}
                  style={{ border: '3px solid var(--accent)' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{username}</p>
                  <p className="text-sm text-muted-foreground">
                    {reconnecting ? 'Resuming your game' : 'Waiting for the host to start'}
                    <span className="dots">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                  </p>
                </div>
                <span className="inline-block h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
              </div>
              <div className="mt-4">
                <p className="mb-2 text-center text-xs text-muted-foreground">
                  Send a reaction
                </p>
                <div className="reaction-bar">
                  {REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="reaction-btn"
                      disabled={cooling}
                      onClick={() => sendReaction(emoji)}
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          }
        />
      </div>
    </PageCenter>
  );
}
