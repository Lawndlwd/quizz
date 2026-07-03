import { Confetti } from '@/components/game/Confetti';
import { Podium } from '@/components/game/Podium';
import { PageCenter } from '@/components/layout';
import { Button } from '@/components/ui/button';
import type { GameEndedPayload } from '@/types';

interface Props {
  leaderboard: GameEndedPayload['leaderboard'];
  onContinue: () => void;
}

export function PodiumScreen({ leaderboard, onContinue }: Props) {
  return (
    <PageCenter className="flex-col gap-8">
      <Confetti count={40} spread="center" durationRange={[0.6, 2]} />

      <h1 className="text-center text-[2rem]">🏆 Final Podium</h1>
      <Podium leaderboard={leaderboard} columnClassName="podium-column" />
      <Button type="button" variant="default" size="lg" onClick={onContinue}>
        See Full Results →
      </Button>
    </PageCenter>
  );
}
