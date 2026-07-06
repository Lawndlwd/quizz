import { Check, Heart, MapPin, Target, Trophy, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppAlert } from '@/components/AppAlert';
import { ClosestGuessesList, LeaderboardList } from '@/components/game/LeaderboardList';
import { QuestionDistribution } from '@/components/game/QuestionDistribution';
import { Page } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { sound } from '@/lib/sound';
import type { LeaderboardEntry, QuestionResults } from '../../../types';

interface Props {
  results: QuestionResults;
  playerId: number;
  autoAdvanceLeft: number;
  onReveal?: () => void;
}

function AdvanceHint({
  autoAdvanceSec,
  autoAdvanceLeft,
}: {
  autoAdvanceSec: number;
  autoAdvanceLeft: number;
}) {
  return (
    <p className="mt-4 text-center text-sm text-muted-foreground">
      {autoAdvanceSec > 0 ? (
        <>
          Next question in <strong className="text-blue-400">{autoAdvanceLeft}s</strong>…
        </>
      ) : (
        'Waiting for admin to continue…'
      )}
    </p>
  );
}

function YourAnswer({ entry, results }: { entry: LeaderboardEntry; results: QuestionResults }) {
  const opts = results.options;
  let body: React.ReactNode;
  switch (results.questionType) {
    case 'open_text':
      body = entry.chosenText ? entry.chosenText : <em>No answer</em>;
      break;
    case 'fill_blank': {
      const b = entry.chosenBlanks ?? [];
      body = b.length ? b.map((x) => x || '—').join('   ·   ') : <em>No answer</em>;
      break;
    }
    case 'ordering': {
      const o = entry.chosenOrder ?? [];
      body = o.length ? (
        <ol className="list-decimal space-y-0.5 pl-5">
          {o.map((it, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: positional order
            <li key={i}>{it}</li>
          ))}
        </ol>
      ) : (
        <em>No answer</em>
      );
      break;
    }
    case 'geo':
      body =
        entry.chosenPoint != null ? (
          <>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" /> your pin
            </span>
            {entry.distance != null && (
              <span className="text-muted-foreground">
                {' '}
                · {Math.round(entry.distance).toLocaleString()} km away
              </span>
            )}
          </>
        ) : (
          <em>No pin</em>
        );
      break;
    case 'multi_select': {
      const idxs = entry.chosenIndices ?? [];
      body = idxs.length ? idxs.map((i) => opts[i]).join(', ') : <em>No answer</em>;
      break;
    }
    default:
      body =
        entry.chosenIndex != null && entry.chosenIndex >= 0 ? (
          opts[entry.chosenIndex]
        ) : (
          <em>No answer</em>
        );
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-card px-4 py-3 text-sm">
      <span className="mb-1 block text-[0.72rem] font-semibold uppercase tracking-wider text-muted-foreground">
        Your answer
      </span>
      <div className={entry.isCorrect ? 'font-semibold text-emerald-400' : 'font-semibold'}>
        {body}
      </div>
    </div>
  );
}

export function ResultsScreen({ results, playerId, autoAdvanceLeft, onReveal }: Props) {
  const myEntry = results.leaderboard.find((e) => e.playerId === playerId);
  const isClosestTo = results.questionType === 'closest_to';
  const closestList = results.closestRanking ?? [];

  // Reveal drama: a short heartbeat pause before the answer distribution, then
  // the correct/wrong sting lands exactly when the result appears.
  const [revealed, setRevealed] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per question (keyed on questionId); myEntry is stable within a round
  useEffect(() => {
    sound.play('heartbeat');
    const t = setTimeout(() => {
      setRevealed(true);
      onReveal?.();
      if (myEntry) sound.play(myEntry.isCorrect ? 'correct' : 'wrong');
    }, 1200);
    return () => clearTimeout(t);
  }, [results.questionId]);

  if (!revealed) {
    return (
      <Page className="mx-auto w-full max-w-[600px] px-4 py-6">
        <div className="pre-reveal">
          <Heart className="pre-reveal-heart" fill="currentColor" />
          <span>Revealing…</span>
        </div>
      </Page>
    );
  }

  return (
    <Page className="mx-auto w-full max-w-[600px] px-4 py-6">
      <Card className="mb-4 min-w-0 max-w-full">
        <CardContent className="p-6">
          <p className="mb-3 text-sm text-muted-foreground">{results.questionText}</p>
          <QuestionDistribution
            results={results}
            myChosenIndex={myEntry?.chosenIndex}
            myChosenIndices={myEntry?.chosenIndices}
            myChosenPoint={myEntry?.chosenPoint}
          />
        </CardContent>
      </Card>

      {myEntry && !isClosestTo && <YourAnswer entry={myEntry} results={results} />}

      {myEntry && isClosestTo && (
        <AppAlert
          variant={myEntry.isCorrect ? 'success' : 'info'}
          className="text-center text-[1.05rem] font-semibold"
        >
          {myEntry.isCorrect ? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-4" /> Exact match!
            </span>
          ) : (
            <>
              Your guess: <strong>{myEntry.chosenNumber}</strong>
              {myEntry.distance != null && <> (off by {myEntry.distance})</>}
            </>
          )}
          {myEntry.questionScore > 0 && (
            <>
              {' '}
              <span className="score-pop">+{myEntry.questionScore}</span> pts · Total:{' '}
              {myEntry.totalScore.toLocaleString()}
            </>
          )}
        </AppAlert>
      )}

      {myEntry && !isClosestTo && (
        <AppAlert
          variant={myEntry.isCorrect ? 'success' : 'error'}
          className={cn(
            'text-center text-[1.05rem] font-semibold',
            myEntry.isCorrect ? 'result-flash-correct' : 'result-flash-wrong',
          )}
        >
          {myEntry.isCorrect ? (
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-4" /> Correct!{' '}
              <span className="score-pop">+{myEntry.questionScore}</span> pts · Total:{' '}
              {myEntry.totalScore.toLocaleString()}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <X className="size-4" /> Wrong — {myEntry.totalScore.toLocaleString()} pts total
            </span>
          )}
        </AppAlert>
      )}

      {isClosestTo && closestList.length > 0 && (
        <Card className="mb-4 min-w-0 max-w-full">
          <CardContent className="p-6">
            <h2 className="mb-4 flex items-center justify-center gap-1.5">
              <Target className="size-4" /> Closest Guesses
            </h2>
            <ClosestGuessesList entries={closestList} highlightPlayerId={playerId} animate />
          </CardContent>
        </Card>
      )}

      {results.showLeaderboard !== false && (
        <Card className="min-w-0 max-w-full">
          <CardContent className="p-6">
            <h2 className="mb-4 flex items-center justify-center gap-1.5">
              <Trophy className="size-4" /> Standings
            </h2>
            <LeaderboardList
              entries={results.leaderboard}
              limit={8}
              highlightPlayerId={playerId}
              showQuestionScore
              animate
            />
            <AdvanceHint
              autoAdvanceSec={results.autoAdvanceSec}
              autoAdvanceLeft={autoAdvanceLeft}
            />
          </CardContent>
        </Card>
      )}

      {results.showLeaderboard === false && (
        <AdvanceHint autoAdvanceSec={results.autoAdvanceSec} autoAdvanceLeft={autoAdvanceLeft} />
      )}
    </Page>
  );
}
