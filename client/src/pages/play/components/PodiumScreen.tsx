import { ArrowRight, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Confetti } from '@/components/game/Confetti';
import { Podium } from '@/components/game/Podium';
import { PageCenter } from '@/components/layout';
import { Button } from '@/components/ui/button';
import type { GameEndedPayload, ThemeId } from '@/types';

interface Props {
  leaderboard: GameEndedPayload['leaderboard'];
  onContinue: () => void;
  theme?: ThemeId;
}

export function PodiumScreen({ leaderboard, onContinue, theme }: Props) {
  const [celebrate, setCelebrate] = useState(false);
  return (
    <PageCenter className="flex-col gap-8">
      {celebrate && (
        <Confetti count={40} spread="center" durationRange={[0.6, 2]} palette={theme} />
      )}

      <h1 className="flex items-center justify-center gap-2 text-center text-[2rem]">
        <Trophy className="size-8" /> Final Podium
      </h1>
      <Podium
        leaderboard={leaderboard}
        columnClassName="podium-column"
        sequenced
        onSequenceEnd={() => setCelebrate(true)}
      />
      <Button type="button" variant="default" size="lg" onClick={onContinue}>
        <span className="inline-flex items-center gap-1.5">
          See Full Results <ArrowRight className="size-4" />
        </span>
      </Button>
    </PageCenter>
  );
}
