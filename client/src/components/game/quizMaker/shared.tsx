import { Crown } from 'lucide-react';
import { type RefObject, useLayoutEffect, useRef } from 'react';
import { AvatarDisplay } from '@/components/AvatarPicker';
import type { Body } from './physics';

export interface PickerPlayer {
  rank: number;
  username: string;
  totalScore: number;
  avatar?: string;
}

/** Contract every quiz-maker mini game implements. */
export interface PickerGameProps {
  players: PickerPlayer[];
  /** Short live status line shown above the board (call only when it changes). */
  onStatus: (text: string) => void;
  /** Called once with the username who makes the next quiz. */
  onFinish: (username: string) => void;
}

export const BALL_R = 12;

/** Ref that always holds the latest value — lets a sim loop call fresh callbacks without restarting. */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** Binds rendered ball nodes to the bodies of a running simulation. */
export function attachElements(bodies: Body[], elements: Map<string, HTMLDivElement>) {
  for (const b of bodies) {
    b.el = elements.get(b.id) ?? null;
    if (b.el) b.el.style.opacity = '1';
  }
}

interface BallProps {
  player: PickerPlayer;
  elements: Map<string, HTMLDivElement>;
  radius?: number;
  highlight?: boolean;
}

/** Avatar ball: outer node is moved by the sim, inner node spins, the name label stays upright. */
export function Ball({ player, elements, radius = BALL_R, highlight }: BallProps) {
  return (
    <div
      ref={(el) => {
        if (el) elements.set(player.username, el);
        else elements.delete(player.username);
      }}
      className="absolute top-0 left-0 drop-shadow-[0_0_6px_rgba(0,0,0,.6)] transition-opacity duration-300"
      style={{
        willChange: 'transform',
        transform: 'translate3d(-100px, -100px, 0)',
        transformOrigin: 'center',
      }}
    >
      <div className={`rounded-full ${highlight ? 'animate-pulse ring-2 ring-[#fbbf24]' : ''}`}>
        <AvatarDisplay avatar={player.avatar} size={radius * 2} />
      </div>
      <span className="pointer-events-none absolute top-full left-1/2 mt-0.5 max-w-[64px] -translate-x-1/2 truncate text-center text-[10px] leading-none font-semibold whitespace-nowrap text-white [text-shadow:0_1px_2px_rgba(0,0,0,.9)]">
        {player.username}
      </span>
    </div>
  );
}

export const ANIMATIONS = `
@keyframes qmp-pop {
  0% { transform: scale(0.3); opacity: 0; }
  60% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes qmp-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
@keyframes qmp-glow {
  0%, 100% { box-shadow: 0 0 18px 2px rgba(251, 191, 36, .45); }
  50% { box-shadow: 0 0 34px 8px rgba(251, 191, 36, .75); }
}
@keyframes qmp-shake {
  0%, 100% { transform: translate(0, 0) rotate(0); }
  20% { transform: translate(-3px, 1px) rotate(-4deg); }
  40% { transform: translate(3px, -1px) rotate(4deg); }
  60% { transform: translate(-2px, -1px) rotate(-3deg); }
  80% { transform: translate(2px, 1px) rotate(3deg); }
}
@keyframes qmp-boom {
  0% { transform: scale(0.2); opacity: 1; }
  70% { transform: scale(2.6); opacity: 1; }
  100% { transform: scale(3.2); opacity: 0; }
}
`;

interface WinnerOverlayProps {
  player: PickerPlayer;
  caption: string;
}

/** Celebration shown on top of the board once the quiz maker is decided. */
export function WinnerOverlay({ player, caption }: WinnerOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="flex flex-col items-center gap-2 text-center"
        style={{ animation: 'qmp-pop 600ms cubic-bezier(.2,.8,.3,1.2) both' }}
      >
        <div
          className="flex flex-col items-center gap-2"
          style={{ animation: 'qmp-float 2.4s ease-in-out 600ms infinite' }}
        >
          <div className="text-xs font-bold tracking-widest text-white/70 uppercase">{caption}</div>
          <Crown className="size-9 text-[#fbbf24] drop-shadow-[0_0_8px_rgba(251,191,36,.7)]" />
          <div
            className="rounded-full border-4 border-[#fbbf24] p-1"
            style={{ animation: 'qmp-glow 1.8s ease-in-out infinite' }}
          >
            <AvatarDisplay avatar={player.avatar} size={96} />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-white">{player.username}</div>
          <div className="text-sm font-semibold text-[#fbbf24]">makes the next quiz!</div>
        </div>
      </div>
    </div>
  );
}
