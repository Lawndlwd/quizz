import { LobbyPlayers } from '@/components/game/LobbyPlayers';
import { QuizIntroCard } from '@/components/game/QuizIntroCard';
import { MainContent } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PlayerInfo, QuizIntro } from '@/types';

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
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Join the game</div>
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

        <div className="mt-5 mb-3 text-sm font-semibold text-muted-foreground">
          {players.length} player{players.length !== 1 ? 's' : ''} joined
        </div>

        <LobbyPlayers players={players} />

        <Button
          type="button"
          size="lg"
          onClick={onStart}
          disabled={players.length === 0}
          className="mt-8 rounded-2xl border-none bg-gradient-to-br from-brand-strong to-brand px-8 py-[15px] text-[17px] font-bold text-primary-foreground hover:opacity-95"
        >
          Start game →
        </Button>
      </div>
    </MainContent>
  );
}
