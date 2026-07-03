import { PageCenter } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  isCorrect: boolean;
  score: number;
  streak?: number;
  wasPassJoker?: boolean;
  answeredCount: number;
  totalPlayers: number;
}

export function AnsweredScreen({
  isCorrect,
  streak = 0,
  wasPassJoker,
  answeredCount,
  totalPlayers,
}: Props) {
  const answerPct = totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0;
  const showCombo = isCorrect && !wasPassJoker && streak >= 2;

  return (
    <PageCenter>
      <Card>
        <CardContent className="p-8 text-center">
          <div className="answer-overlay">
            {wasPassJoker ? (
              <>
                <span className="answer-icon">⏭</span>
                <div className="answer-label">Question Skipped</div>
              </>
            ) : (
              <>
                <span className="answer-icon">🔒</span>
                <div className="answer-label">Answer locked in!</div>
              </>
            )}

            {showCombo && (
              <div className="streak-combo">
                <span className="streak-flame">🔥</span>
                <span className="streak-count">{streak}× streak!</span>
              </div>
            )}

            {totalPlayers > 0 && (
              <div className="mt-6">
                <div className="answer-counter mb-2 text-[1.1rem]">
                  {answeredCount} / {totalPlayers} answered
                </div>
                <div className="answer-bar mx-auto max-w-[220px]">
                  <div className="answer-bar-fill" style={{ width: `${answerPct}%` }} />
                </div>
              </div>
            )}

            <p className="mt-4 text-sm text-muted-foreground">
              Waiting for other players
              <span className="dots">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    </PageCenter>
  );
}
