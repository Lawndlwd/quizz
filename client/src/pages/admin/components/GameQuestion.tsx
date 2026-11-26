import type { ReactNode } from 'react';
import { QuestionDisplay } from '@/components/game/QuestionDisplay';
import { MainContent } from '@/components/layout';
import { Button } from '@/components/ui/button';
import type { QuestionPayload } from '../../../types';

interface Props {
  question: QuestionPayload;
  timeLeft: number;
  reading?: boolean;
  readLeft?: number;
  answeredCount: number;
  totalPlayers: number;
  /** Presentation mode: the big screen plays media and sound, not the host console. */
  presentationMode?: boolean;
  onEndGame: () => void;
  onFinishQuestion: () => void;
  children?: ReactNode;
}

export function GameQuestion({
  question,
  timeLeft,
  reading,
  readLeft,
  answeredCount,
  totalPlayers,
  presentationMode,
  onEndGame,
  onFinishQuestion,
  children,
}: Props) {
  const controls = (
    <>
      <Button type="button" size="sm" onClick={onFinishQuestion}>
        Finish Question
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onEndGame}>
        End Game
      </Button>
    </>
  );

  // Classic games: this console is what the room sees on the projector, so it uses the
  // same full-screen, no-scroll views as the presentation screen.
  if (!presentationMode) {
    return (
      <div className="screen-stage fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-background">
        <div className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col justify-center">
          <QuestionDisplay
            stage
            question={question}
            timeLeft={timeLeft}
            reading={reading}
            readLeft={readLeft}
            answeredCount={answeredCount}
            totalPlayers={totalPlayers}
            actions={controls}
          />
        </div>
      </div>
    );
  }

  return (
    <MainContent>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">{controls}</div>

      {children}

      <QuestionDisplay
        question={question}
        timeLeft={timeLeft}
        reading={reading}
        readLeft={readLeft}
        answeredCount={answeredCount}
        totalPlayers={totalPlayers}
        hideMedia={presentationMode}
        silent={presentationMode}
      />
    </MainContent>
  );
}
