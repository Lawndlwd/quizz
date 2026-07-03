import { useState } from 'react';
import { type LatLng, MapPicker } from '@/components/GeoMap';
import { QuadOptionGrid } from '@/components/game/QuadOptionGrid';
import { TimerBar } from '@/components/game/TimerBar';
import { PageVCenter } from '@/components/layout';
import { OptionText } from '@/components/OptionText';
import { QuestionImage } from '@/components/QuestionImage';
import { QuestionMedia } from '@/components/QuestionMedia';
import { QuestionText } from '@/components/QuestionText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { countBlanks, hasQuestionImage, quadColor } from '@/helpers';
import type { QuestionPayload } from '@/types';

interface Props {
  question: QuestionPayload;
  timeLeft: number;
  selectedIndex: number | null;
  selectedIndices: number[];
  multiSelectSubmitted: boolean;
  openTextInput: string;
  openTextSubmitted: boolean;
  closestValue: number;
  closestSubmitted: boolean;
  eliminatedIndices: number[];
  answeredCount: number;
  totalPlayers: number;
  jokersEnabled: { pass: boolean; fiftyFifty: boolean };
  jokersUsed: { pass: boolean; fiftyFifty: boolean };
  onAnswer: (index: number) => void;
  onToggleMultiSelect: (index: number) => void;
  onMultiSelectSubmit: () => void;
  onOpenTextChange: (value: string) => void;
  onOpenTextSubmit: () => void;
  onClosestChange: (value: number) => void;
  onClosestSubmit: () => void;
  onPassJoker: () => void;
  onFiftyFiftyJoker: () => void;
  onFillSubmit: (answers: string[]) => void;
  onOrderSubmit: (order: number[]) => void;
  onGeoSubmit: (lat: number, lng: number) => void;
}

export function QuestionScreen({
  question,
  timeLeft,
  selectedIndex,
  selectedIndices,
  multiSelectSubmitted,
  openTextInput,
  openTextSubmitted,
  closestValue,
  closestSubmitted,
  eliminatedIndices,
  answeredCount,
  totalPlayers,
  jokersEnabled,
  jokersUsed,
  onAnswer,
  onToggleMultiSelect,
  onMultiSelectSubmit,
  onOpenTextChange,
  onOpenTextSubmit,
  onClosestChange,
  onClosestSubmit,
  onPassJoker,
  onFiftyFiftyJoker,
  onFillSubmit,
  onOrderSubmit,
  onGeoSubmit,
}: Props) {
  const isTrueFalse = question.questionType === 'true_false';
  const isOpenText = question.questionType === 'open_text';
  const isClosestTo = question.questionType === 'closest_to';
  const isMultiSelect = question.questionType === 'multi_select';
  const isMultipleChoice = question.questionType === 'multiple_choice';
  const isFillBlank = question.questionType === 'fill_blank';
  const isOrdering = question.questionType === 'ordering';
  const isGeo = question.questionType === 'geo';
  const rangeMin = question.rangeMin ?? 0;
  const rangeMax = question.rangeMax ?? 100;

  // Ephemeral answer state for the newer types. Lazy-initialised from the
  // question (this component remounts per question), then reset below if the
  // same instance ever receives a new questionId.
  const blankCount = question.blankCount ?? countBlanks(question.text);
  const [fillValues, setFillValues] = useState<string[]>(() =>
    Array.from({ length: blankCount }, () => ''),
  );
  const [order, setOrder] = useState<number[]>(() => question.options.map((_, i) => i));
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const [pinPoint, setPinPoint] = useState<LatLng | null>(null);

  // Reset ephemeral answer state when a new question arrives — the React
  // "reset state on prop change" pattern (runs during render, no effect needed).
  const [renderedFor, setRenderedFor] = useState(question.questionId);
  if (renderedFor !== question.questionId) {
    setRenderedFor(question.questionId);
    setFillValues(Array.from({ length: blankCount }, () => ''));
    setOrder(question.options.map((_, i) => i));
    setLocalSubmitted(false);
    setPinPoint(null);
  }

  const hasAnswered =
    selectedIndex !== null ||
    openTextSubmitted ||
    multiSelectSubmitted ||
    closestSubmitted ||
    localSubmitted;
  const showImage = hasQuestionImage(question.imageUrl);

  function submitFill() {
    if (localSubmitted) return;
    setLocalSubmitted(true);
    onFillSubmit(fillValues);
  }

  function moveOrder(from: number, dir: -1 | 1) {
    setOrder((prev) => {
      const to = from + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  function submitOrder() {
    if (localSubmitted) return;
    setLocalSubmitted(true);
    onOrderSubmit(order);
  }

  function submitGeo() {
    if (localSubmitted || !pinPoint) return;
    setLocalSubmitted(true);
    onGeoSubmit(pinPoint.lat, pinPoint.lng);
  }

  return (
    <PageVCenter>
      <div
        className={
          showImage ? 'mx-auto w-full max-w-[min(900px,95vw)]' : 'mx-auto w-full max-w-[700px]'
        }
      >
        <div className="question-header">
          <div className="question-counter">
            Question {question.questionIndex + 1} of {question.totalQuestions}
          </div>
          {question.mediaType ? (
            <QuestionMedia url={question.mediaUrl} kind={question.mediaType} className="my-3" />
          ) : (
            <QuestionImage src={question.imageUrl} className="question-image" />
          )}
          <div
            className="question-text"
            style={{ marginTop: question.mediaType || showImage ? 12 : 0 }}
          >
            <QuestionText text={question.text} />
          </div>
          {isClosestTo && (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text2)',
                margin: '4px 0 0',
                textAlign: 'center',
              }}
            >
              Pick the closest number ({rangeMin}–{rangeMax})
            </p>
          )}
          {isMultiSelect && (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text2)',
                margin: '4px 0 0',
                textAlign: 'center',
              }}
            >
              Select all correct answers
            </p>
          )}
          <TimerBar timeLeft={timeLeft} totalSec={question.timeSec} className="mt-4 gap-3" />
          {/* Answer counter */}
          {totalPlayers > 0 && (
            <div className="answer-counter">
              {answeredCount} / {totalPlayers} answered
            </div>
          )}
        </div>

        {/* Joker buttons */}
        {(jokersEnabled.pass || jokersEnabled.fiftyFifty) && !hasAnswered && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              padding: '0 20px 4px',
              justifyContent: 'flex-end',
            }}
          >
            {jokersEnabled.pass && (
              <Button
                type="button"
                variant="warning"
                size="sm"
                disabled={jokersUsed.pass}
                title={
                  jokersUsed.pass
                    ? 'Pass already used'
                    : 'Skip this question and receive the base score'
                }
                onClick={onPassJoker}
              >
                {jokersUsed.pass ? '✓ Pass' : '⏭ Pass'}
              </Button>
            )}
            {jokersEnabled.fiftyFifty && isMultipleChoice && (
              <Button
                type="button"
                variant="warning"
                size="sm"
                disabled={jokersUsed.fiftyFifty}
                title={jokersUsed.fiftyFifty ? '50/50 already used' : 'Eliminate 2 wrong answers'}
                onClick={onFiftyFiftyJoker}
              >
                {jokersUsed.fiftyFifty ? '✓ 50/50' : '50/50'}
              </Button>
            )}
          </div>
        )}

        {isTrueFalse ? (
          <QuadOptionGrid
            className="p-5"
            options={['True', 'False']}
            selectedIndex={selectedIndex}
            colorFor={(i) => (i === 0 ? '#1f9d57' : '#e2455a')}
            badgeFor={(i) => (i === 0 ? '✓' : '✗')}
            optionClassName="justify-center"
            labelClassName="flex-none"
            onSelect={onAnswer}
          />
        ) : isClosestTo ? (
          <div style={{ padding: '20px' }}>
            <div
              className="option-stagger"
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '20px',
              }}
            >
              {(() => {
                const outOfRange =
                  !Number.isInteger(closestValue) ||
                  closestValue < rangeMin ||
                  closestValue > rangeMax;
                return (
                  <>
                    <label
                      htmlFor="closest-answer"
                      className="mb-2 block text-sm font-medium text-muted-foreground"
                    >
                      Your answer — whole number between {rangeMin} and {rangeMax}
                    </label>
                    <Input
                      id="closest-answer"
                      type="number"
                      inputMode="numeric"
                      min={rangeMin}
                      max={rangeMax}
                      step={1}
                      value={Number.isNaN(closestValue) ? '' : closestValue}
                      disabled={closestSubmitted}
                      aria-invalid={outOfRange}
                      onKeyDown={(e) => {
                        if (['.', ',', 'e', 'E', '+', '-'].includes(e.key)) {
                          e.preventDefault();
                        } else if (e.key === 'Enter' && !closestSubmitted && !outOfRange) {
                          onClosestSubmit();
                        }
                      }}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') return;
                        const next = Math.trunc(Number(raw));
                        if (!Number.isNaN(next)) onClosestChange(next);
                      }}
                      className="mb-2 text-center text-lg"
                    />
                    <p
                      className={`mb-3 text-sm ${outOfRange ? 'text-destructive' : 'text-muted-foreground'}`}
                    >
                      {outOfRange
                        ? `Enter a whole number from ${rangeMin} to ${rangeMax}.`
                        : `Range: ${rangeMin} – ${rangeMax}`}
                    </p>
                    <Button
                      type="button"
                      variant="default"
                      size="lg"
                      className="w-full"
                      onClick={onClosestSubmit}
                      disabled={closestSubmitted || outOfRange}
                    >
                      {closestSubmitted ? 'Submitted!' : 'Submit Answer →'}
                    </Button>
                  </>
                );
              })()}
            </div>
          </div>
        ) : isOpenText ? (
          <div style={{ padding: '20px' }}>
            <div
              className="option-stagger"
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '20px',
              }}
            >
              <label
                htmlFor="open-text-answer"
                style={{
                  display: 'block',
                  color: 'var(--text2)',
                  fontSize: '0.85rem',
                  marginBottom: 10,
                  fontWeight: 500,
                }}
              >
                Your answer
              </label>
              <Input
                id="open-text-answer"
                type="text"
                value={openTextInput}
                onChange={(e) => onOpenTextChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !openTextSubmitted && onOpenTextSubmit()}
                disabled={openTextSubmitted}
                placeholder="Type your answer…"
                className="mb-3 text-lg"
              />
              <Button
                type="button"
                variant="default"
                size="lg"
                className="w-full"
                onClick={onOpenTextSubmit}
                disabled={openTextSubmitted || !openTextInput.trim()}
              >
                {openTextSubmitted ? 'Submitted!' : 'Submit Answer →'}
              </Button>
            </div>
          </div>
        ) : isMultiSelect ? (
          <div className="p-5">
            <QuadOptionGrid
              options={question.options}
              selectedIndices={selectedIndices}
              selectedBadge="✓"
              disabled={multiSelectSubmitted}
              onSelect={onToggleMultiSelect}
            />
            <Button
              type="button"
              variant="default"
              size="lg"
              className="mt-4 w-full"
              onClick={onMultiSelectSubmit}
              disabled={multiSelectSubmitted || selectedIndices.length === 0}
            >
              {multiSelectSubmitted
                ? 'Submitted!'
                : `Submit ${selectedIndices.length > 0 ? `(${selectedIndices.length} selected)` : ''} →`}
            </Button>
          </div>
        ) : isFillBlank ? (
          <div className="p-5">
            <div
              className="option-stagger"
              style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '20px',
              }}
            >
              <p className="text-[1.05rem] leading-loose">
                {question.text.split(/_{3,}/).map((frag, fi) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: fragments are positional
                  <span key={fi}>
                    {frag}
                    {fi < blankCount && (
                      <input
                        type="text"
                        value={fillValues[fi] ?? ''}
                        disabled={localSubmitted}
                        onChange={(e) =>
                          setFillValues((v) => {
                            const n = [...v];
                            n[fi] = e.target.value;
                            return n;
                          })
                        }
                        onKeyDown={(e) => e.key === 'Enter' && submitFill()}
                        placeholder={`#${fi + 1}`}
                        className="mx-1 inline-block w-[120px] rounded-md border border-border bg-background px-2 py-1 text-center align-middle text-base"
                      />
                    )}
                  </span>
                ))}
              </p>
              <Button
                type="button"
                variant="default"
                size="lg"
                className="mt-4 w-full"
                onClick={submitFill}
                disabled={localSubmitted || fillValues.slice(0, blankCount).some((v) => !v.trim())}
              >
                {localSubmitted ? 'Submitted!' : 'Submit Answer →'}
              </Button>
            </div>
          </div>
        ) : isOrdering ? (
          <div className="p-5">
            <p className="mb-2 text-center text-sm" style={{ color: 'var(--text2)' }}>
              Arrange the items into the correct order
            </p>
            <div className="flex flex-col gap-2">
              {order.map((optIdx, pos) => (
                <div
                  key={optIdx}
                  className="flex items-center gap-2 rounded-lg border border-border bg-[var(--surface2)] p-3"
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-extrabold text-white"
                    style={{ background: quadColor(pos) }}
                  >
                    {pos + 1}
                  </span>
                  <span className="flex-1">
                    <OptionText value={question.options[optIdx]} imgClassName="option-img-sm" />
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pos === 0 || localSubmitted}
                    onClick={() => moveOrder(pos, -1)}
                    title="Move up"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={pos === order.length - 1 || localSubmitted}
                    onClick={() => moveOrder(pos, 1)}
                    title="Move down"
                  >
                    ↓
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="default"
              size="lg"
              className="mt-4 w-full"
              onClick={submitOrder}
              disabled={localSubmitted}
            >
              {localSubmitted ? 'Submitted!' : 'Submit Order →'}
            </Button>
          </div>
        ) : isGeo ? (
          <div className="p-5">
            <p className="mb-2 text-center text-sm" style={{ color: 'var(--text2)' }}>
              Drop your pin on the map — closest to the real spot wins
            </p>
            <MapPicker
              value={pinPoint}
              onChange={localSubmitted ? () => {} : setPinPoint}
              height="52vh"
            />
            <Button
              type="button"
              variant="default"
              size="lg"
              className="mt-4 w-full"
              onClick={submitGeo}
              disabled={localSubmitted || !pinPoint}
            >
              {localSubmitted
                ? 'Submitted!'
                : pinPoint
                  ? 'Submit pin →'
                  : 'Tap the map to place your pin'}
            </Button>
          </div>
        ) : (
          <QuadOptionGrid
            className="p-5"
            options={question.options}
            selectedIndex={selectedIndex}
            eliminatedIndices={eliminatedIndices}
            onSelect={onAnswer}
          />
        )}
      </div>
    </PageVCenter>
  );
}
