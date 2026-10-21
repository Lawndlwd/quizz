import { Crown, Play, RotateCw, Target, Users } from 'lucide-react';
import { useCallback, useState } from 'react';
import { AvatarDisplay } from '@/components/AvatarPicker';
import { Confetti } from '@/components/game/Confetti';
import { PlinkoElimination } from '@/components/game/quizMaker/PlinkoElimination';
import {
  ANIMATIONS,
  type PickerGameProps,
  type PickerPlayer,
  WinnerOverlay,
} from '@/components/game/quizMaker/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { sound } from '@/lib/sound';

interface Props {
  players: PickerPlayer[];
}

type Phase = 'idle' | 'playing' | 'done';

const GAME_NAME = 'Plinko Elimination';
const CAPTION = 'Last one in the red!';

/**
 * Final-podium "next quiz maker" picker. The host checks the players in the draw and
 * runs Plinko Elimination: green slots are safe, red keep you in, and the last one left
 * makes the next quiz — a visible physics result, never a hidden random pick. The
 * winner is celebrated right on the board. Purely presentational, nothing persisted.
 */
export function QuizMakerPicker({ players }: Props) {
  // Players are identified by username (unique per session) — ranks can tie.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [phase, setPhase] = useState<Phase>('idle');
  const [runId, setRunId] = useState(0);
  const [dropList, setDropList] = useState<PickerPlayer[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [celebrate, setCelebrate] = useState(false);

  const handleFinish = useCallback((username: string) => {
    sound.stop('drumroll');
    sound.play('fanfare');
    setWinner(username);
    setPhase('done');
    setCelebrate(true);
  }, []);

  function toggle(username: string) {
    if (phase === 'playing') return;
    setWinner(null);
    setCelebrate(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  }

  const candidates = players.filter((p) => selected.has(p.username));

  function start(list: PickerPlayer[]) {
    if (list.length < 2 || phase === 'playing') return;
    setDropList(list);
    setRunId((id) => id + 1);
    setWinner(null);
    setCelebrate(false);
    setStatus('');
    setPhase('playing');
  }

  function backToList() {
    sound.stop('drumroll');
    setCelebrate(false);
    setPhase('idle');
  }

  const winnerPlayer = players.find((p) => p.username === winner);
  const gameProps: PickerGameProps = {
    players: dropList,
    onStatus: setStatus,
    onFinish: handleFinish,
  };

  return (
    <Card
      className={`relative mx-auto mb-8 w-full overflow-hidden border-blue-500/40 bg-blue-500/[0.06] ${
        phase === 'idle' ? 'max-w-xl' : 'max-w-4xl'
      }`}
    >
      <style>{ANIMATIONS}</style>
      {celebrate && <Confetti count={40} spread="center" durationRange={[0.6, 2]} />}
      <CardContent className="p-6">
        <div className="mb-1 flex items-center justify-center gap-2 text-lg font-extrabold">
          <Target className="size-5" /> Next Quiz Maker
        </div>
        <p className="mb-4 min-h-5 text-center text-sm text-muted-foreground">
          {phase === 'idle'
            ? 'Green slots are safe, red keep you in. Last one left makes the quiz.'
            : phase === 'done' && winnerPlayer
              ? `${CAPTION} ${winnerPlayer.username} makes the next quiz!`
              : status}
        </p>

        {phase === 'idle' ? (
          <ul className="mb-4 flex flex-col gap-2">
            {players.map((p) => {
              const isWin = winner === p.username;
              return (
                <li key={p.username}>
                  {/* biome-ignore lint/a11y/noLabelWithoutControl: Checkbox renders the control */}
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-all ${
                      isWin
                        ? 'border-[#fbbf24] bg-[rgba(251,191,36,.12)]'
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <Checkbox
                      checked={selected.has(p.username)}
                      onCheckedChange={() => toggle(p.username)}
                    />
                    <AvatarDisplay avatar={p.avatar} size={30} />
                    <span className="flex-1 font-semibold">{p.username}</span>
                    {isWin && <Crown className="size-5 text-[#fbbf24]" />}
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="relative mb-4">
            <PlinkoElimination key={runId} {...gameProps} />
            {phase === 'done' && winnerPlayer && (
              <WinnerOverlay player={winnerPlayer} caption={CAPTION} />
            )}
          </div>
        )}

        {phase === 'done' ? (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" size="lg" variant="outline" onClick={backToList}>
              <Users className="size-4" /> Change players
            </Button>
            <Button type="button" size="lg" onClick={() => start(dropList)}>
              Play again <RotateCw className="size-4" />
            </Button>
          </div>
        ) : phase === 'playing' ? (
          <Button type="button" size="lg" variant="outline" className="w-full" onClick={backToList}>
            Stop
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => start(candidates)}
            disabled={candidates.length < 2}
          >
            {candidates.length < 2 ? (
              'Check at least 2 players'
            ) : (
              <>
                Start {GAME_NAME} ({candidates.length}) <Play className="size-4" />
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
