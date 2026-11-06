import { Trophy } from 'lucide-react';
import { useState } from 'react';
import { Confetti } from '@/components/game/Confetti';
import { FinalLeaderboard } from '@/components/game/LeaderboardList';
import { Podium } from '@/components/game/Podium';
import { QuizMakerPicker } from '@/components/game/QuizMakerPicker';
import { Card, CardContent } from '@/components/ui/card';
import type { FinalLeaderboardEntry } from '@/types';

interface Props {
  title: string;
  leaderboard: FinalLeaderboardEntry[];
  chooseQuizMaker: boolean;
}

export function ScreenEnded({ title, leaderboard, chooseQuizMaker }: Props) {
  const [celebrate, setCelebrate] = useState(false);

  if (leaderboard.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-4xl font-extrabold">Game ended</h1>
        <p className="text-xl text-muted-foreground">{title}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col items-center justify-center gap-8 p-6">
      {celebrate && <Confetti />}
      <h1 className="flex items-center gap-3 text-center text-5xl font-extrabold">
        <Trophy className="size-12" /> Final Podium
      </h1>
      <Podium leaderboard={leaderboard} sequenced onSequenceEnd={() => setCelebrate(true)} />
      {chooseQuizMaker && <QuizMakerPicker players={leaderboard} />}
      {leaderboard.length > 3 && (
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6">
            <FinalLeaderboard entries={leaderboard.slice(0, 10)} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
