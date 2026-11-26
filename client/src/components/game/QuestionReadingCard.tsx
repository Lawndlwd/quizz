import { Presentation } from 'lucide-react';
import { QuestionText } from '@/components/QuestionText';
import { cn } from '@/lib/utils';
import type { QuestionPayload } from '@/types';

interface Props {
  question: QuestionPayload;
  /** Seconds left before the choices appear. */
  readLeft: number;
  /** Room-scale sizing for the presentation screen. */
  stage?: boolean;
  /** Presentation-mode phone: the question is on the big screen, not here. */
  hideText?: boolean;
}

/**
 * Reading phase: the question alone, big and centered, before choices and the
 * answer timer appear. Fills the viewport so nothing scrolls.
 */
export function QuestionReadingCard({ question, readLeft, stage, hideText }: Props) {
  const total = Math.max(1, question.readSec ?? readLeft);
  const pct = Math.max(0, Math.min(100, (readLeft / total) * 100));

  return (
    <div
      className={cn(
        'q-reading flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden text-center',
        stage ? 'gap-[4vh] px-[6vw]' : 'gap-6 px-5',
      )}
    >
      <span className="question-counter">
        Question {question.questionIndex + 1} of {question.totalQuestions}
      </span>

      {hideText ? (
        <p className="inline-flex items-center gap-2 text-xl font-bold text-muted-foreground">
          <Presentation className="size-6" /> Read the question on the big screen
        </p>
      ) : (
        <div
          className="q-reading-text max-w-[1400px] font-extrabold"
          style={{
            fontSize: stage ? 'clamp(2.4rem, 5.5vw, 6.5rem)' : 'clamp(1.5rem, 7vw, 2.6rem)',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}
        >
          <QuestionText text={question.text} />
        </div>
      )}

      <div
        className={cn('flex w-full flex-col items-center gap-2', stage ? 'max-w-xl' : 'max-w-xs')}
      >
        <div className="q-reading-bar">
          <div className="q-reading-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className={cn('font-semibold text-muted-foreground', stage ? 'text-2xl' : 'text-sm')}>
          Choices in {readLeft}…
        </span>
      </div>
    </div>
  );
}
