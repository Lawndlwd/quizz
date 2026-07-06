import { Check } from 'lucide-react';
import { QuadGlyph } from '@/components/game/QuadGlyph';
import { QuestionReveal } from '@/components/game/QuestionReveal';
import { OptionText } from '@/components/OptionText';
import { QuestionExplanation } from '@/components/QuestionExplanation';
import { quadColor } from '@/helpers';
import type { LeaderboardEntry, QuestionResults } from '@/types';

interface Props {
  results: QuestionResults;
  /** Player view: highlight the option this player chose */
  myChosenIndex?: number | null;
  myChosenIndices?: number[] | null;
  /** Player view: where this player dropped their pin, for geo questions */
  myChosenPoint?: { lat: number; lng: number } | null;
}

/** Tally per-option votes from the leaderboard (fallback when the server omits it). */
function distributionFromLeaderboard(
  leaderboard: LeaderboardEntry[],
  optionCount: number,
  isMultiSelect: boolean,
): number[] {
  const dist = new Array<number>(optionCount).fill(0);
  for (const e of leaderboard) {
    if (isMultiSelect) {
      for (const i of e.chosenIndices ?? []) {
        if (i >= 0 && i < optionCount) dist[i]++;
      }
    } else if (e.chosenIndex != null && e.chosenIndex >= 0 && e.chosenIndex < optionCount) {
      dist[e.chosenIndex]++;
    }
  }
  return dist;
}

/**
 * Color-Quadrants results reveal — correct-answer pill + per-option vote
 * distribution bars with geometric glyphs. Falls back to the option-grid
 * reveal for open-text / closest-to questions (no per-option votes).
 */
export function QuestionDistribution({
  results,
  myChosenIndex,
  myChosenIndices,
  myChosenPoint,
}: Props) {
  const isOptionBased =
    results.questionType === 'multiple_choice' ||
    results.questionType === 'multi_select' ||
    results.questionType === 'true_false';
  const isMultiSelect = results.questionType === 'multi_select';

  const dist =
    isOptionBased && results.options.length > 0
      ? (results.answerDistribution ??
        distributionFromLeaderboard(results.leaderboard, results.options.length, isMultiSelect))
      : null;

  if (!dist) {
    return (
      <QuestionReveal
        results={results}
        myChosenIndex={myChosenIndex}
        myChosenIndices={myChosenIndices}
        myChosenPoint={myChosenPoint}
        animate
      />
    );
  }

  const isCorrect = (i: number) =>
    isMultiSelect ? (results.correctIndices ?? []).includes(i) : i === results.correctIndex;

  const totalVotes = dist.reduce((a, b) => a + b, 0);
  const maxVotes = Math.max(1, ...dist);
  const correctText = results.options.filter((_, i) => isCorrect(i)).join(', ');
  // Reveal drama: bars grow one after another; the correct bar(s) land last.
  const stagger = 0.15;
  const lastDelay = (results.options.length - 1) * stagger + 0.3;

  return (
    <>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[22px] font-extrabold tracking-tight">Answers</span>
        <span className="correct-pill inline-flex items-center gap-1">
          <Check className="size-4" /> Correct: {correctText}
        </span>
      </div>
      <div className="mb-4 text-[13px] text-muted-foreground">
        {totalVotes} vote{totalVotes === 1 ? '' : 's'} total
      </div>

      <div className="flex flex-col gap-3">
        {results.options.map((opt, i) => {
          const correct = isCorrect(i);
          const votes = dist[i] ?? 0;
          // Bar length is proportional to votes, normalised to the most-voted
          // option: the top option(s) fill the bar, the rest scale down.
          const width = (votes / maxVotes) * 100;
          // Only the correct answer's bar is green; others are a neutral grey so
          // the per-option colors don't read as "also correct".
          const barColor = correct ? '#22c55e' : '#6b6b85';
          const mine =
            (myChosenIndex != null && myChosenIndex === i) || !!myChosenIndices?.includes(i);
          return (
            <div key={String.fromCharCode(65 + i)} className={`dist-row ${correct ? '' : 'dim'}`}>
              <span className="dist-glyph" style={{ background: quadColor(i) }} aria-hidden="true">
                <QuadGlyph index={i} size={20} />
              </span>
              <div className="flex-1">
                <div className="dist-head">
                  <span>
                    <OptionText value={opt} imgClassName="option-img-sm" />
                    {correct && <Check className="ml-1.5 inline size-4 text-[#4ade80]" />}
                    {mine && <span className="ml-1.5 text-muted-foreground">· you</span>}
                  </span>
                  <span>
                    {votes} vote{votes === 1 ? '' : 's'}
                  </span>
                </div>
                <div className={`dist-bar${correct ? ' correct-glow' : ''}`}>
                  <div
                    className="dist-bar-fill"
                    style={{
                      width: `${width}%`,
                      background: barColor,
                      animationDelay: `${correct ? lastDelay : i * stagger}s`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <QuestionExplanation explanation={results.explanation} />
    </>
  );
}
