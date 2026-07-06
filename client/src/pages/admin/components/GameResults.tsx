import { ArrowRight, Flag, Heart, Music, Trophy, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ClosestGuessesList, LeaderboardList } from '@/components/game/LeaderboardList';
import { QuestionDistribution } from '@/components/game/QuestionDistribution';
import { MainContent } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { sound } from '@/lib/sound';
import type { NextPreview, QuestionResults } from '../../../types';

interface Props {
  results: QuestionResults;
  questionIndex: number;
  autoAdvanceLeft: number;
  nextPreview?: NextPreview | null;
  onNextQuestion: () => void;
  onEndGame: () => void;
  onRemovePoints: (playerId: number, questionId: number) => void;
  onOpenPlayerAnswers: (playerId: number) => void;
}

export function GameResults({
  results,
  questionIndex,
  autoAdvanceLeft,
  nextPreview,
  onNextQuestion,
  onEndGame,
  onRemovePoints,
  onOpenPlayerAnswers,
}: Props) {
  const isClosestTo = results.questionType === 'closest_to';
  const closestList = results.closestRanking ?? [];

  // Reveal drama: a brief heartbeat pause before the distribution appears.
  const [revealed, setRevealed] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-runs each question (keyed on questionId)
  useEffect(() => {
    setRevealed(false);
    sound.play('heartbeat');
    const t = setTimeout(() => setRevealed(true), 1200);
    return () => clearTimeout(t);
  }, [results.questionId]);

  return (
    <MainContent>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2>Results — Q{questionIndex + 1}</h2>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="lg" onClick={onEndGame}>
            End Game
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={onNextQuestion}
            className="relative min-w-0 sm:min-w-[180px]"
          >
            {results.isLastQuestion ? (
              <span className="flex items-center gap-1.5">
                <Flag className="size-4" /> Final Scores
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                Next <ArrowRight className="size-4" />
              </span>
            )}
            {results.autoAdvanceSec > 0 && (
              <span className="ml-1.5 text-[0.75rem] opacity-80">({autoAdvanceLeft}s)</span>
            )}
          </Button>
        </div>
      </div>

      {nextPreview &&
        (nextPreview.hasNext ? (
          <Card className="mb-4 w-full max-w-4xl border-blue-500/30 bg-blue-500/[0.06]">
            <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1 p-4">
              <span className="mono-label text-blue-300">
                Up next · Q{nextPreview.index + 1} of {nextPreview.total}
              </span>
              {nextPreview.mediaType && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-300">
                  {nextPreview.mediaType === 'audio' ? (
                    <>
                      <Music className="size-4" /> Audio
                    </>
                  ) : (
                    <>
                      <Video className="size-4" /> Video
                    </>
                  )}
                </span>
              )}
              <span className="w-full text-[1.05rem] font-semibold">{nextPreview.text}</span>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-4 w-full max-w-4xl border-amber-500/30 bg-amber-500/[0.06]">
            <CardContent className="p-4">
              <span className="mono-label inline-flex items-center gap-1.5 text-amber-300">
                Last question — final scores next <Flag className="size-4" />
              </span>
            </CardContent>
          </Card>
        ))}

      <Card className="mb-4 w-full max-w-4xl">
        <CardContent className="p-6">
          <p className="mb-3 text-sm text-muted-foreground">{results.questionText}</p>
          {revealed ? (
            <QuestionDistribution results={results} />
          ) : (
            <div className="pre-reveal">
              <Heart className="pre-reveal-heart" fill="currentColor" />
              <span>Revealing…</span>
            </div>
          )}
        </CardContent>
      </Card>

      {isClosestTo && closestList.length > 0 && (
        <Card className="mb-4 w-full max-w-4xl">
          <CardContent className="p-6">
            <h2 className="mb-4">Closest Guesses</h2>
            <ClosestGuessesList entries={closestList} limit={10} />
          </CardContent>
        </Card>
      )}

      <Card className="w-full max-w-4xl">
        <CardContent className="p-6">
          <h2 className="mb-4 flex items-center gap-1.5">
            <Trophy className="size-4" /> Standings
          </h2>
          <LeaderboardList
            entries={results.leaderboard}
            limit={10}
            showQuestionScore
            renderActions={(e) => (
              <div className="ml-2 flex shrink-0 gap-1">
                {e.questionScore > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-2 py-0.5 text-[0.7rem] text-destructive"
                    title="Remove points for this question"
                    onClick={() => onRemovePoints(e.playerId, results.questionId)}
                  >
                    Remove pts
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-1.5 py-0.5 text-[0.8rem]"
                  title="View all answers"
                  onClick={() => onOpenPlayerAnswers(e.playerId)}
                >
                  ...
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </MainContent>
  );
}
