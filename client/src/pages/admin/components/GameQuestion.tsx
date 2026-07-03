import { QuadOptionGrid } from '@/components/game/QuadOptionGrid';
import { TimerBar } from '@/components/game/TimerBar';
import { MainContent } from '@/components/layout';
import { QuestionImage } from '@/components/QuestionImage';
import { QuestionMedia } from '@/components/QuestionMedia';
import { QuestionText } from '@/components/QuestionText';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { hasQuestionImage } from '@/helpers';
import type { QuestionPayload } from '../../../types';

interface Props {
  question: QuestionPayload;
  timeLeft: number;
  answeredCount: number;
  totalPlayers: number;
  onEndGame: () => void;
  onFinishQuestion: () => void;
}

export function GameQuestion({
  question,
  timeLeft,
  answeredCount,
  totalPlayers,
  onEndGame,
  onFinishQuestion,
}: Props) {
  const showImage = hasQuestionImage(question.imageUrl);
  const isOptionBased =
    question.questionType !== 'open_text' && question.questionType !== 'closest_to';

  const options =
    question.questionType === 'true_false' && question.options.length === 0
      ? ['True', 'False']
      : question.options;

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

      <Card className="w-full max-w-5xl min-w-full">
        <CardContent className="flex flex-col p-8 md:p-10">
          {/* Counter row */}
          <div className="mb-4 flex items-center justify-between">
            <span className="mono-label">
              Question {question.questionIndex + 1} of {question.totalQuestions}
            </span>
            <span className="mono-label">{question.timeSec}s</span>
          </div>

          {question.mediaType ? (
            <QuestionMedia url={question.mediaUrl} kind={question.mediaType} className="mb-5" />
          ) : (
            showImage && (
              <QuestionImage src={question.imageUrl} className="question-image-host mb-5" />
            )
          )}

          {/* Big centered question */}
          <div
            className="mx-auto mb-5 max-w-[820px] text-center font-extrabold"
            style={{
              fontSize: 'clamp(1.6rem, 4vw, 42px)',
              lineHeight: 1.16,
              letterSpacing: '-0.02em',
            }}
          >
            <QuestionText text={question.text} />
          </div>

          {/* Timer bar + number */}
          <TimerBar timeLeft={timeLeft} totalSec={question.timeSec} className="mb-2 gap-4" />

          <div className="mb-6 text-center text-[13px] text-[#64748b]">
            {answeredCount} / {totalPlayers} answered
          </div>

          {isOptionBased && (
            <QuadOptionGrid
              options={options}
              interactive={false}
              glyphSize={26}
              staggerSec={0.07}
            />
          )}

          {question.questionType === 'closest_to' && (
            <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-center">
              <p className="text-sm text-muted-foreground">
                Closest-to question — players pick a number from{' '}
                <strong>
                  {question.rangeMin ?? 0} to {question.rangeMax ?? 100}
                </strong>
              </p>
            </div>
          )}
          {question.questionType === 'open_text' && (
            <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-center">
              <p className="text-sm text-muted-foreground">
                Open-text question — players type their answer
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </MainContent>
  );
}
