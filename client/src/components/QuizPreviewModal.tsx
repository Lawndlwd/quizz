import { ArrowLeft, ArrowRight, Check, Eye, SkipForward, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { QuestionReveal } from '@/components/game/QuestionReveal';
import { PageVCenter } from '@/components/layout';
import { QuestionImage } from '@/components/QuestionImage';
import { QuestionMedia } from '@/components/QuestionMedia';
import { QuestionText } from '@/components/QuestionText';
import { Button } from '@/components/ui/button';
import { countBlanks, hasQuestionImage } from '@/helpers';
import { useCountdown } from '@/hooks/useCountdown';
import { QuestionScreen } from '@/pages/play/components/QuestionScreen';
import type { ImportQuestion, QuestionPayload, QuestionResults, ThemeId } from '@/types';

interface Props {
  title: string;
  questions: ImportQuestion[];
  onClose: () => void;
  /** Render the preview in the quiz's theme (matches the real game). */
  theme?: ThemeId;
}

type Phase = 'question' | 'reveal';

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Solo, socket-free preview of a quiz — plays the player's view locally so a
 * creator can step through every question (and its answer reveal) without
 * starting a real session or opening a second window. Interactive, with a
 * skippable timer.
 */
export function QuizPreviewModal({ title, questions, onClose, theme }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');

  // Player answer state (mirrors Game.tsx, minus the socket).
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [multiSelectSubmitted, setMultiSelectSubmitted] = useState(false);
  const [openTextInput, setOpenTextInput] = useState('');
  const [openTextSubmitted, setOpenTextSubmitted] = useState(false);
  const [closestValue, setClosestValue] = useState(50);
  const [closestSubmitted, setClosestSubmitted] = useState(false);
  const [fillAnswers, setFillAnswers] = useState<string[]>([]);
  const [chosenPoint, setChosenPoint] = useState<{ lat: number; lng: number } | null>(null);

  const timer = useCountdown(0);
  // Guards the auto-reveal: only fire once the timer has actually ticked above 0
  // (on first render `timer.seconds` is 0 before the start effect runs).
  const sawPositive = useRef(false);
  const q = questions[index];
  const type = q?.questionType ?? 'multiple_choice';

  // Reset per-question state and (re)start the timer whenever the question changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally keyed on index only
  useEffect(() => {
    if (!q) return;
    setPhase('question');
    setSelectedIndex(null);
    setSelectedIndices([]);
    setMultiSelectSubmitted(false);
    setOpenTextInput('');
    setOpenTextSubmitted(false);
    setClosestSubmitted(false);
    setFillAnswers([]);
    setChosenPoint(null);
    if (type === 'closest_to') {
      const min = q.rangeMin ?? 0;
      const max = q.rangeMax ?? 100;
      setClosestValue(Math.round((min + max) / 2));
    }
    sawPositive.current = false;
    timer.start(q.timeSec ?? 20);
    return () => timer.stop();
  }, [index]);

  // Timer runs out → auto-reveal (only after it has counted down from a positive value).
  useEffect(() => {
    if (phase !== 'question') return;
    if (timer.seconds > 0) sawPositive.current = true;
    else if (sawPositive.current) setPhase('reveal');
  }, [phase, timer.seconds]);

  const payload: QuestionPayload | null = useMemo(() => {
    if (!q) return null;
    return {
      questionIndex: index,
      totalQuestions: questions.length,
      questionId: index,
      text: q.text,
      options: q.options ?? [],
      timeSec: q.timeSec ?? 20,
      imageUrl: q.imageUrl,
      explanation: q.explanation,
      questionType: type,
      correctAnswer: q.correctAnswer,
      rangeMin: q.rangeMin,
      rangeMax: q.rangeMax,
      mediaUrl: q.mediaUrl,
      mediaType: q.mediaType,
      blankCount: q.blanks?.length ?? countBlanks(q.text),
    };
  }, [q, index, questions.length, type]);

  if (!q || !payload) return null;

  const reveal = () => {
    timer.stop();
    setPhase('reveal');
  };
  const next = () => {
    if (index < questions.length - 1) setIndex(index + 1);
    else onClose();
  };
  const prev = () => index > 0 && setIndex(index - 1);

  // Correctness for the badge — only for types with a single right/wrong answer.
  // Ordering/geo/closest_to score by proximity, so we don't show a verdict there.
  function verdict(): boolean | null {
    switch (type) {
      case 'multiple_choice':
      case 'true_false':
        return selectedIndex === q.correctIndex;
      case 'multi_select': {
        const want = [...(q.correctIndices ?? [])].sort().join(',');
        const got = [...selectedIndices].sort().join(',');
        return want === got;
      }
      case 'open_text':
        return norm(openTextInput) === norm(q.correctAnswer ?? '');
      case 'fill_blank': {
        const blanks = q.blanks ?? [];
        if (!blanks.length) return null;
        return blanks.every((accepted, i) =>
          accepted.some((a) => norm(a) === norm(fillAnswers[i] ?? '')),
        );
      }
      default:
        return null;
    }
  }

  const results: Pick<
    QuestionResults,
    | 'questionType'
    | 'correctAnswer'
    | 'correctIndex'
    | 'correctIndices'
    | 'correctBlanks'
    | 'correctOrder'
    | 'geo'
    | 'imageUrl'
    | 'options'
    | 'rangeMin'
    | 'rangeMax'
    | 'explanation'
  > = {
    questionType: type,
    options: q.options ?? [],
    correctIndex: q.correctIndex,
    correctIndices: q.correctIndices,
    correctAnswer: q.correctAnswer ?? null,
    correctBlanks: q.blanks?.map((b) => b[0] ?? ''),
    correctOrder: q.options,
    geo: q.geo ?? undefined,
    imageUrl: q.imageUrl,
    rangeMin: q.rangeMin,
    rangeMax: q.rangeMax,
    explanation: q.explanation,
  };

  const showImage = hasQuestionImage(q.imageUrl);
  const v = phase === 'reveal' ? verdict() : null;

  return (
    <div data-theme={theme} className="fixed inset-0 z-[1100] overflow-y-auto bg-[var(--bg)]">
      {/* Top-left preview badge */}
      <div className="fixed left-3 top-3 z-[210] flex max-w-[calc(100%-4rem)] items-center gap-2 sm:left-4 sm:top-4">
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[var(--accent)] px-2 py-1.5 text-xs font-bold tracking-wide text-white shadow-lg sm:px-2.5">
          <Eye className="size-4" /> PREVIEW
        </span>
        <span className="truncate rounded-md bg-black/55 px-2 py-1.5 text-xs font-medium text-white backdrop-blur sm:max-w-[38vw] sm:px-2.5">
          {title || 'Untitled quiz'}
        </span>
      </div>

      {/* Top-right close */}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onClose}
        title="Close preview"
        className="fixed right-3 top-3 z-[210] shadow-lg sm:right-4 sm:top-4"
      >
        <X className="size-4" />
        <span className="hidden sm:inline"> Close</span>
      </Button>

      {/* Bottom control bar */}
      <div className="fixed bottom-3 left-3 right-3 z-[210] flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-border bg-[var(--surface)] px-2 py-2 shadow-2xl sm:bottom-5 sm:left-1/2 sm:right-auto sm:w-auto sm:-translate-x-1/2 sm:gap-2 sm:rounded-full sm:px-3">
        <Button type="button" variant="ghost" size="sm" onClick={prev} disabled={index === 0}>
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline"> Prev</span>
        </Button>
        <span className="px-1 text-sm font-semibold tabular-nums">
          {index + 1}/{questions.length}
        </span>
        {phase === 'question' ? (
          <Button type="button" variant="default" size="sm" onClick={reveal}>
            <SkipForward className="size-4" />
            <span className="hidden sm:inline"> Reveal answer</span>
            <span className="sm:hidden"> Reveal</span>
          </Button>
        ) : (
          <Button type="button" variant="default" size="sm" onClick={next}>
            {index < questions.length - 1 ? (
              <>
                <span className="hidden sm:inline">Next question </span>
                <span className="sm:hidden">Next </span>
                <ArrowRight className="size-4" />
              </>
            ) : (
              <>
                Finish <Check className="size-4" />
              </>
            )}
          </Button>
        )}
      </div>

      <div className="pb-32 sm:pb-28">
        {phase === 'question' ? (
          <QuestionScreenPreview
            key={index}
            payload={payload}
            timeLeft={timer.seconds}
            selectedIndex={selectedIndex}
            selectedIndices={selectedIndices}
            multiSelectSubmitted={multiSelectSubmitted}
            openTextInput={openTextInput}
            openTextSubmitted={openTextSubmitted}
            closestValue={closestValue}
            closestSubmitted={closestSubmitted}
            onAnswer={(i) => setSelectedIndex(i)}
            onToggleMultiSelect={(i) =>
              setSelectedIndices((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]))
            }
            onMultiSelectSubmit={() => setMultiSelectSubmitted(true)}
            onOpenTextChange={setOpenTextInput}
            onOpenTextSubmit={() => setOpenTextSubmitted(true)}
            onClosestChange={setClosestValue}
            onClosestSubmit={() => setClosestSubmitted(true)}
            onFillSubmit={(a) => {
              setFillAnswers(a);
              reveal();
            }}
            onOrderSubmit={() => reveal()}
            onGeoSubmit={(lat, lng) => {
              setChosenPoint({ lat, lng });
              reveal();
            }}
          />
        ) : (
          <PageVCenter>
            <div className="mx-auto w-full max-w-[700px]">
              {payload.mediaType ? (
                <QuestionMedia url={payload.mediaUrl} kind={payload.mediaType} className="mb-3" />
              ) : (
                showImage && <QuestionImage src={q.imageUrl} className="question-image mb-3" />
              )}
              <div className="question-text mb-4 text-center">
                <QuestionText text={q.text} />
              </div>
              {v !== null && (
                <div
                  className={`mb-4 rounded-lg px-4 py-2 text-center font-semibold ${
                    v ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                  }`}
                >
                  {v ? (
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <Check className="size-4" /> Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <X className="size-4" /> Incorrect
                    </span>
                  )}
                </div>
              )}
              <QuestionReveal
                results={results}
                myChosenIndex={selectedIndex}
                myChosenIndices={selectedIndices}
                myChosenPoint={chosenPoint}
                animate
              />
            </div>
          </PageVCenter>
        )}
      </div>
    </div>
  );
}

// Thin wrapper so the preview passes the no-op joker props QuestionScreen needs.
function QuestionScreenPreview({
  payload,
  ...rest
}: {
  payload: QuestionPayload;
  timeLeft: number;
  selectedIndex: number | null;
  selectedIndices: number[];
  multiSelectSubmitted: boolean;
  openTextInput: string;
  openTextSubmitted: boolean;
  closestValue: number;
  closestSubmitted: boolean;
  onAnswer: (i: number) => void;
  onToggleMultiSelect: (i: number) => void;
  onMultiSelectSubmit: () => void;
  onOpenTextChange: (v: string) => void;
  onOpenTextSubmit: () => void;
  onClosestChange: (v: number) => void;
  onClosestSubmit: () => void;
  onFillSubmit: (a: string[]) => void;
  onOrderSubmit: (o: number[]) => void;
  onGeoSubmit: (lat: number, lng: number) => void;
}) {
  return (
    <QuestionScreen
      question={payload}
      eliminatedIndices={[]}
      answeredCount={0}
      totalPlayers={0}
      jokersEnabled={{ pass: false, fiftyFifty: false }}
      jokersUsed={{ pass: false, fiftyFifty: false }}
      onPassJoker={() => {}}
      onFiftyFiftyJoker={() => {}}
      {...rest}
    />
  );
}
