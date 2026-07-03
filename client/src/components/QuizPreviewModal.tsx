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
import type { ImportQuestion, QuestionPayload, QuestionResults } from '@/types';

interface Props {
  title: string;
  questions: ImportQuestion[];
  onClose: () => void;
}

type Phase = 'question' | 'reveal';

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Solo, socket-free preview of a quiz — plays the player's view locally so a
 * creator can step through every question (and its answer reveal) without
 * starting a real session or opening a second window. Interactive, with a
 * skippable timer.
 */
export function QuizPreviewModal({ title, questions, onClose }: Props) {
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
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-[var(--bg)]">
      {/* Top-left preview badge */}
      <div className="fixed left-4 top-4 z-[210] flex items-center gap-2">
        <span className="rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-xs font-bold tracking-wide text-white shadow-lg">
          👁 PREVIEW
        </span>
        <span className="max-w-[38vw] truncate rounded-md bg-black/55 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur">
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
        className="fixed right-4 top-4 z-[210] shadow-lg"
      >
        ✕ Close
      </Button>

      {/* Floating bottom control bar — always visible */}
      <div className="fixed bottom-5 left-1/2 z-[210] flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-[var(--surface)] px-3 py-2 shadow-2xl">
        <Button type="button" variant="ghost" size="sm" onClick={prev} disabled={index === 0}>
          ← Prev
        </Button>
        <span className="px-1 text-sm font-semibold tabular-nums">
          {index + 1} / {questions.length}
        </span>
        {phase === 'question' ? (
          <Button type="button" variant="default" onClick={reveal}>
            ⏭ Reveal answer
          </Button>
        ) : (
          <Button type="button" variant="default" onClick={next}>
            {index < questions.length - 1 ? 'Next question →' : 'Finish ✓'}
          </Button>
        )}
      </div>

      <div className="pb-28">
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
                  {v ? '✓ Correct' : '✗ Incorrect'}
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
