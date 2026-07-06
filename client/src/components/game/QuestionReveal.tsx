import { Check, MapPin } from 'lucide-react';
import { MapReveal } from '@/components/GeoMap';
import { OptionText } from '@/components/OptionText';
import { QuestionExplanation } from '@/components/QuestionExplanation';
import { optionLetter } from '@/helpers';
import type { QuestionResults } from '@/types';

interface Props {
  results: Pick<
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
  >;
  /** Player view: highlight chosen vs correct options */
  myChosenIndex?: number | null;
  myChosenIndices?: number[] | null;
  /** Player view: where this player dropped their pin, for geo questions */
  myChosenPoint?: { lat: number; lng: number } | null;
  animate?: boolean;
}

export function QuestionReveal({
  results,
  myChosenIndex,
  myChosenIndices,
  myChosenPoint,
  animate = false,
}: Props) {
  const isOpenText = results.questionType === 'open_text';
  const isMultiSelect = results.questionType === 'multi_select';
  const isClosestTo = results.questionType === 'closest_to';
  const isFillBlank = results.questionType === 'fill_blank';
  const isOrdering = results.questionType === 'ordering';
  const isGeo = results.questionType === 'geo';

  return (
    <>
      {isFillBlank ? (
        <div className="result-reveal-correct rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="mb-2 text-[0.78rem] text-muted-foreground">Correct answers</p>
          <ol className="list-decimal space-y-1 pl-5">
            {(results.correctBlanks ?? []).map((ans, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: positional blanks
              <li key={i} className="font-bold text-emerald-500">
                {ans}
              </li>
            ))}
          </ol>
        </div>
      ) : isOrdering ? (
        <div className="result-reveal-correct rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="mb-2 text-[0.78rem] text-muted-foreground">Correct order</p>
          <ol className="list-decimal space-y-1 pl-5">
            {(results.correctOrder ?? results.options).map((item, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: positional order
              <li key={i} className="font-semibold text-emerald-500">
                {item}
              </li>
            ))}
          </ol>
        </div>
      ) : isGeo ? (
        <div className="result-reveal-correct rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="mb-2 text-[0.78rem] text-muted-foreground">Correct location</p>
          {results.geo ? (
            <MapReveal correct={results.geo} guess={myChosenPoint ?? undefined} height={300} />
          ) : (
            <p className="text-sm text-muted-foreground">Location revealed on the host screen.</p>
          )}
          <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
            <Check className="size-3.5 text-emerald-500" /> correct
            {myChosenPoint ? (
              <>
                · <MapPin className="size-3.5" /> your pin
              </>
            ) : null}
          </p>
        </div>
      ) : isClosestTo ? (
        <div className="result-reveal-correct rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="mb-1 text-[0.78rem] text-muted-foreground">Correct answer</p>
          <p className="text-[1.8rem] font-bold text-emerald-500">{results.correctAnswer}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Range: {results.rangeMin}–{results.rangeMax}
          </p>
        </div>
      ) : isOpenText ? (
        <div className="result-reveal-correct rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="mb-1 text-[0.78rem] text-muted-foreground">Correct answer</p>
          <p className="text-[1.1rem] font-bold text-emerald-500">{results.correctAnswer}</p>
        </div>
      ) : (
        <div className={`options-grid ${animate ? 'gap-2 p-0' : ''}`}>
          {results.options.map((opt, i) => {
            const isCorrect = isMultiSelect
              ? (results.correctIndices ?? []).includes(i)
              : i === results.correctIndex;
            const myChoice =
              myChosenIndex !== undefined || myChosenIndices !== undefined
                ? isMultiSelect
                  ? (myChosenIndices ?? []).includes(i)
                  : myChosenIndex === i
                : false;
            return (
              <div
                key={optionLetter(i)}
                className={`option-btn ${animate ? 'result-reveal' : ''} ${isCorrect ? 'correct' : myChoice ? 'wrong' : ''}`}
                style={{
                  cursor: 'default',
                  ...(animate ? { animationDelay: `${i * 0.06}s` } : {}),
                }}
              >
                <div className="option-letter">{optionLetter(i)}</div>
                <div className="option-text">
                  <OptionText value={opt} imgClassName="option-img-sm" />
                </div>
                {isCorrect && <Check className="ml-auto size-4" />}
              </div>
            );
          })}
        </div>
      )}
      <QuestionExplanation explanation={results.explanation} />
    </>
  );
}
