import { Heart, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ClosestGuessesList, LeaderboardList } from '@/components/game/LeaderboardList';
import { QuestionDistribution } from '@/components/game/QuestionDistribution';
import { QuestionText } from '@/components/QuestionText';
import { Card, CardContent } from '@/components/ui/card';
import { sound } from '@/lib/sound';
import type { QuestionResults } from '@/types';

export function ScreenResults({ results }: { results: QuestionResults }) {
  const closest = results.closestRanking ?? [];
  const showStandings = results.showLeaderboard !== false;

  const [revealed, setRevealed] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-runs each question (keyed on questionId)
  useEffect(() => {
    setRevealed(false);
    sound.play('heartbeat');
    const t = setTimeout(() => setRevealed(true), 1200);
    return () => clearTimeout(t);
  }, [results.questionId]);

  return (
    <div
      className={`mx-auto grid w-full max-w-[1600px] flex-1 content-center gap-6 p-4 lg:p-8 ${
        showStandings ? 'lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : ''
      }`}
    >
      <Card>
        <CardContent className="p-6 lg:p-8">
          <div
            className="mb-5 font-extrabold"
            style={{ fontSize: 'clamp(1.4rem, 2.6vw, 3rem)', lineHeight: 1.2 }}
          >
            <QuestionText text={results.questionText} />
          </div>
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

      {showStandings && (
        <Card>
          <CardContent className="p-6 lg:p-8">
            {closest.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-4 text-2xl">Closest guesses</h2>
                <ClosestGuessesList entries={closest} limit={3} />
              </div>
            )}
            <h2 className="mb-4 flex items-center gap-2 text-2xl">
              <Trophy className="size-6" /> Standings
            </h2>
            <LeaderboardList entries={results.leaderboard} limit={5} showQuestionScore animate />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
