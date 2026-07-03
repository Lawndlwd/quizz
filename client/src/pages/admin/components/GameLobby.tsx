import { QuizIntroCard } from '@/components/game/QuizIntroCard';
import { MainContent } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PlayerInfo, QuizIntro } from '@/types';
import { AvatarDisplay } from '../../../components/AvatarPicker';

interface Props {
  quizTitle?: string;
  questionCount: number;
  intro?: QuizIntro | null;
  pin: string;
  shareUrl: string;
  players: PlayerInfo[];
  onStart: () => void;
  onDiscard: () => void;
  onCopyLink: () => void;
}

export function GameLobby({
  quizTitle,
  questionCount,
  intro,
  pin,
  shareUrl,
  players,
  onStart,
  onDiscard,
  onCopyLink,
}: Props) {
  let joinHost = shareUrl;
  try {
    joinHost = new URL(shareUrl).host;
  } catch {
    /* keep raw shareUrl */
  }

  return (
    <MainContent>
      <div className="mb-4 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onDiscard}>
          Discard
        </Button>
      </div>

      {intro ? (
        <QuizIntroCard intro={intro} layout="row" typesHeading="Question types" className="mb-9" />
      ) : (
        <div className="mb-6">
          <h1>{quizTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {questionCount} question{questionCount !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      <div className="flex flex-col items-center gap-1.5 text-center">
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
          Join the game
        </div>
        <div className="text-[15px] text-muted-foreground">
          Go to <strong className="text-foreground">{joinHost}</strong> and enter this PIN
        </div>

        <div className="pin-display mt-1">{pin}</div>

        {/* Share link */}
        <div className="mt-3 flex w-full max-w-[440px] gap-2">
          <Input
            readOnly
            value={shareUrl}
            className="flex-1"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button type="button" variant="secondary" onClick={onCopyLink}>
            Copy
          </Button>
        </div>

        <div className="mt-5 mb-3 text-sm font-semibold text-slate-300">
          {players.length} player{players.length !== 1 ? 's' : ''} joined
        </div>

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
                className="flex items-center gap-2.5 rounded-full border border-white/[.08] bg-white/[.05] py-2 pl-2 pr-5"
                style={{ animation: `fadeUp .3s ${i * 0.04}s both` }}
              >
                <AvatarDisplay avatar={p.avatar} size={40} />
                <span className="text-[16px] font-semibold">{p.username}</span>
              </div>
            ))
          )}
        </div>

        <Button
          type="button"
          size="lg"
          onClick={onStart}
          disabled={players.length === 0}
          className="mt-8 rounded-2xl border-none bg-gradient-to-br from-blue-400 to-blue-600 px-8 py-[15px] text-[17px] font-bold text-white shadow-[0_10px_30px_-8px_#3b82f6aa] hover:opacity-95"
        >
          Start game →
        </Button>
      </div>
    </MainContent>
  );
}
