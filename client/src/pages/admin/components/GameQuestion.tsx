import type { ReactNode } from 'react';
import { QuestionDisplay } from '@/components/game/QuestionDisplay';
import { MainContent } from '@/components/layout';
import { Button } from '@/components/ui/button';
import type { QuestionPayload } from '../../../types';

interface Props {
  question: QuestionPayload;
  timeLeft: number;
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
  answeredCount,
  totalPlayers,
  presentationMode,
  onEndGame,
  onFinishQuestion,
  children,
}: Props) {
  return (
    <MainContent>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <Button type="button" size="sm" onClick={onFinishQuestion}>
          Finish Question
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onEndGame}>
          End Game
        </Button>
      </div>

      {children}

      <QuestionDisplay
        question={question}
        timeLeft={timeLeft}
        answeredCount={answeredCount}
        totalPlayers={totalPlayers}
        hideMedia={presentationMode}
        silent={presentationMode}
      />
    </MainContent>
  );
}
