import { Flag, Gamepad2, ThumbsUp, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { FinalLeaderboard } from '@/components/game/LeaderboardList';
import { MedalIcon } from '@/components/game/MedalIcon';
import { PageCenter, Subtitle } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { GameEndedPayload } from '@/types';

interface Props {
  leaderboard: GameEndedPayload['leaderboard'];
  username: string;
  onPlayAgain: () => void;
}

function getRankMessage(rank: number, total: number): { icon: ReactNode; title: string } {
  if (rank === 1) return { icon: <Trophy className="size-12" />, title: 'Champion!' };
  if (rank === 2)
    return { icon: <MedalIcon place={2} className="size-12" />, title: 'Almost there!' };
  if (rank === 3)
    return { icon: <MedalIcon place={3} className="size-12" />, title: 'On the podium!' };
  if (rank <= Math.ceil(total / 2))
    return { icon: <ThumbsUp className="size-12" />, title: 'Well played!' };
  return { icon: <Gamepad2 className="size-12" />, title: 'Nice try!' };
}

export function EndedScreen({ leaderboard, username, onPlayAgain }: Props) {
  const myRank = leaderboard.find((e) => e.username === username);
  const { icon, title } = myRank
    ? getRankMessage(myRank.rank, leaderboard.length)
    : { icon: <Flag className="size-12" />, title: 'Game Over!' };

  return (
    <PageCenter>
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="mb-6 text-center">
            <div className="mb-3 flex justify-center">{icon}</div>
            <h1>{title}</h1>
            {myRank && (
              <Subtitle className="mt-2">
                You finished <strong className="text-blue-400">#{myRank.rank}</strong> with{' '}
                <strong className="text-blue-400">{myRank.totalScore.toLocaleString()} pts</strong>
              </Subtitle>
            )}
          </div>
          <h2 className="mb-4 flex items-center justify-center gap-1.5">
            <Trophy className="size-4" /> Final Scores
          </h2>
          <FinalLeaderboard
            entries={leaderboard}
            highlightUsername={username}
            footer={
              <Button
                type="button"
                variant="default"
                size="lg"
                className="mt-6 w-full"
                onClick={onPlayAgain}
              >
                Play Again
              </Button>
            }
          />
        </CardContent>
      </Card>
    </PageCenter>
  );
}
