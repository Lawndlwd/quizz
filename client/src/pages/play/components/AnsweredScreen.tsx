import { Lock, SkipForward } from 'lucide-react';
import { PageCenter } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  isCorrect: boolean;
  score: number;
  wasPassJoker?: boolean;
  answeredCount: number;
  totalPlayers: number;
}

export function AnsweredScreen({
  wasPassJoker,
  answeredCount,
  totalPlayers,
}: Props) {
  const answerPct = totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0;

  return (
    <PageCenter>
      <Card>
        <CardContent className="p-8 text-center">
          <div className="answer-overlay">
            {wasPassJoker ? (
              <>
                <SkipForward className="answer-icon mx-auto size-12" />
                <div className="answer-label">Question Skipped</div>
              </>
            ) : (
              <>
                <Lock className="answer-icon mx-auto size-12" />
                <div className="answer-label">Answer locked in!</div>
              </>
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
