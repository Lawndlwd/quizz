import { Confetti } from '@/components/game/Confetti';
import { FinalLeaderboard } from '@/components/game/LeaderboardList';
import { Podium } from '@/components/game/Podium';
import { QuizMakerPicker } from '@/components/game/QuizMakerPicker';
import { MainContent, Subtitle } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { FinalLeaderboardEntry } from '@/types';

interface Props {
  quizTitle?: string;
  leaderboard: FinalLeaderboardEntry[];
  chooseQuizMaker?: boolean;
  onViewDetails: () => void;
  onDashboard: () => void;
}

export function GameEnded({
  quizTitle,
  leaderboard,
  chooseQuizMaker,
  onViewDetails,
  onDashboard,
}: Props) {
  return (
    <MainContent>
      <Confetti />

      <div className="mb-6 text-center">
        <h1 className="text-[2rem]">🏆 Final Podium</h1>
        <Subtitle className="mt-1">{quizTitle}</Subtitle>
      </div>

      {leaderboard.length > 0 && <Podium leaderboard={leaderboard} className="mx-auto mb-8" />}

      {chooseQuizMaker && leaderboard.length > 0 && <QuizMakerPicker players={leaderboard} />}

      <Card className="mx-auto w-full max-w-xl">
        <CardContent className="p-6">
          <h2 className="mb-4 text-center">🏆 Final Leaderboard</h2>
          <FinalLeaderboard
            entries={leaderboard}
            footer={
              <div className="mt-6 grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={onViewDetails}
                >
                  View Details
                </Button>
                <Button type="button" className="w-full" onClick={onDashboard}>
                  ← Dashboard
                </Button>
              </div>
            }
          />
        </CardContent>
      </Card>
    </MainContent>
  );
}
