import { QuadOptionGrid } from '@/components/game/QuadOptionGrid';
import { TimerBar } from '@/components/game/TimerBar';
import { OptionText } from '@/components/OptionText';
import { QuestionImage } from '@/components/QuestionImage';
import { QuestionMedia } from '@/components/QuestionMedia';
import { QuestionText } from '@/components/QuestionText';
import { Card, CardContent } from '@/components/ui/card';
import { hasQuestionImage, quadColor } from '@/helpers';
import { cn } from '@/lib/utils';
import type { QuestionPayload } from '@/types';

interface Props {
  question: QuestionPayload;
  timeLeft: number;
  answeredCount: number;
  totalPlayers: number;
  /** Skip audio/video: another device in the room is playing it. */
  hideMedia?: boolean;
  /** Skip the timer tick: another device in the room is the speaker. */
  silent?: boolean;
  /** Room-scale sizing for the presentation screen. */
  stage?: boolean;
}

/** Read-only view of the live question, shared by the host console and the big screen. */
export function QuestionDisplay({
  question,
  timeLeft,
  answeredCount,
  totalPlayers,
  hideMedia,
  silent,
  stage,
}: Props) {
  const showImage = hasQuestionImage(question.imageUrl);
  // Only these types are "pick a tile" answers — ordering/geo/fill_blank/open_text/closest_to
  // don't have a single correct option to highlight, so they get their own message below.
  const isOptionBased =
    question.questionType === 'multiple_choice' ||
    question.questionType === 'true_false' ||
    question.questionType === 'multi_select';

  const options =
    question.questionType === 'true_false' && question.options.length === 0
      ? ['True', 'False']
      : question.options;

  return (
    <Card className={stage ? 'w-full' : 'w-full max-w-5xl'}>
      <CardContent className="flex flex-col p-4 sm:p-8 md:p-10">
        {/* Counter row */}
        <div className="mb-4 flex items-center justify-between">
          <span className="mono-label">
            Question {question.questionIndex + 1} of {question.totalQuestions}
          </span>
          <span className="mono-label">{question.timeSec}s</span>
        </div>

        {question.mediaType
          ? !hideMedia && (
              <QuestionMedia url={question.mediaUrl} kind={question.mediaType} className="mb-5" />
            )
          : showImage && (
              <QuestionImage src={question.imageUrl} className="question-image-host mb-5" />
            )}

        {/* Big centered question */}
        <div
          className={cn('mx-auto mb-5 text-center font-extrabold', !stage && 'max-w-[820px]')}
          style={{
            fontSize: stage ? 'clamp(2rem, 4.5vw, 5rem)' : 'clamp(1.6rem, 4vw, 42px)',
            lineHeight: 1.16,
            letterSpacing: '-0.02em',
          }}
        >
          <QuestionText text={question.text} />
        </div>

        {/* Timer bar + number */}
        <TimerBar
          timeLeft={timeLeft}
          totalSec={question.timeSec}
          className="mb-2 gap-4"
          silent={silent}
        />

        <div className={cn('mb-6 text-center text-[#64748b]', stage ? 'text-2xl' : 'text-[13px]')}>
          {answeredCount} / {totalPlayers} answered
        </div>

        {isOptionBased && (
          <QuadOptionGrid options={options} interactive={false} glyphSize={26} staggerSec={0.07} />
        )}

        <div className="question-detail">
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
          {question.questionType === 'ordering' && (
            <div
              className={cn(
                'w-full',
                stage ? 'grid grid-cols-2 gap-3' : 'mx-auto flex max-w-xl flex-col gap-2',
              )}
            >
              <p className="col-span-2 mb-1 text-center text-sm text-muted-foreground">
                Ordering question — players are dragging these into the correct order
              </p>
              {options.map((opt, pos) => (
                <div
                  key={opt}
                  className="flex items-center gap-2 rounded-lg border border-border bg-[var(--surface2)] p-3"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-extrabold text-white"
                    style={{ background: quadColor(pos) }}
                  >
                    {pos + 1}
                  </span>
                  <span className="flex-1">
                    <OptionText value={opt} imgClassName="option-img-sm" />
                  </span>
                </div>
              ))}
            </div>
          )}
          {question.questionType === 'matching' && (
            <div className="mx-auto grid w-full max-w-2xl grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <p className="mb-1 text-center text-xs text-muted-foreground">Left</p>
                {options.map((opt, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: left items may repeat text
                    key={`left-${i}`}
                    className="flex items-center gap-2 rounded-lg border border-border bg-[var(--surface2)] p-3"
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-extrabold text-white"
                      style={{ background: quadColor(i) }}
                    >
                      {i + 1}
                    </span>
                    <span className="flex-1">
                      <OptionText value={opt} imgClassName="option-img-sm" />
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <p className="mb-1 text-center text-xs text-muted-foreground">Right (shuffled)</p>
                {(question.rightOptions ?? []).map((opt, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: shuffled right column, values may repeat
                    key={`right-${i}`}
                    className="flex items-center gap-2 rounded-lg border border-border bg-[var(--surface2)] p-3"
                  >
                    <span className="flex-1">
                      <OptionText value={opt} imgClassName="option-img-sm" />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {question.questionType === 'geo' && (
            <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-center">
              <p className="text-sm text-muted-foreground">
                Map question — players drop a pin on the map
              </p>
            </div>
          )}
          {question.questionType === 'fill_blank' && (
            <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-center">
              <p className="text-sm text-muted-foreground">
                Fill-in-the-blank question — players fill in {question.blankCount ?? 0} blank
                {question.blankCount === 1 ? '' : 's'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
