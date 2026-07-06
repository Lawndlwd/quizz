import { Crown, Dices, PartyPopper, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AvatarDisplay } from '@/components/AvatarPicker';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface PlayerLike {
  rank: number;
  username: string;
  totalScore: number;
  avatar?: string;
}

interface Props {
  players: PlayerLike[];
}

/**
 * Final-podium "next quiz maker" picker. Host checks any subset of players,
 * then spins a decelerating highlight that lands on one random candidate and
 * announces them. Purely presentational — nothing is persisted.
 */
export function QuizMakerPicker({ players }: Props) {
  // Players are identified by username (unique per session) — ranks can tie.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimer(), []);
  function clearTimer() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function toggle(username: string) {
    if (spinning) return;
    setWinner(null);
    setHighlight(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  }

  function spin() {
    const candidates = players.map((p) => p.username).filter((u) => selected.has(u));
    if (candidates.length === 0 || spinning) return;

    setSpinning(true);
    setWinner(null);

    const finalPick = candidates[Math.floor(Math.random() * candidates.length)];
    const totalSteps = 22 + Math.floor(Math.random() * candidates.length * 2);
    let step = 0;

    const tick = () => {
      step += 1;
      if (step >= totalSteps) {
        setHighlight(finalPick);
        setWinner(finalPick);
        setSpinning(false);
        return;
      }
      setHighlight(candidates[step % candidates.length]);
      // ease-out: delay grows so the highlight visibly slows before landing
      const delay = 55 + step * step * 0.95;
      timer.current = setTimeout(tick, delay);
    };
    tick();
  }

  const winnerName = winner;
  const canSpin = selected.size > 0 && !spinning;

  return (
    <Card className="mx-auto mb-8 w-full max-w-xl border-blue-500/40 bg-blue-500/[0.06]">
      <CardContent className="p-6">
        <div className="mb-1 flex items-center justify-center gap-2 text-lg font-extrabold">
          <Dices className="size-5" /> Next Quiz Maker
        </div>
        <p className="mb-4 text-center text-sm text-muted-foreground">
          Check the players in the draw, then spin.
        </p>

        <ul className="mb-4 flex flex-col gap-2">
          {players.map((p) => {
            const isHi = highlight === p.username;
            const isWin = winner === p.username;
            return (
              <li key={p.username}>
                {/* biome-ignore lint/a11y/noLabelWithoutControl: Checkbox renders the control */}
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition-all ${
                    isWin
                      ? 'border-[#fbbf24] bg-[rgba(251,191,36,.12)]'
                      : isHi
                        ? 'border-blue-400 bg-blue-500/15'
                        : 'border-border bg-muted/30'
                  }`}
                  style={isHi && !isWin ? { transform: 'scale(1.03)' } : undefined}
                >
                  <Checkbox
                    checked={selected.has(p.username)}
                    onCheckedChange={() => toggle(p.username)}
                    disabled={spinning}
                  />
                  <AvatarDisplay avatar={p.avatar} size={30} />
                  <span className="flex-1 font-semibold">{p.username}</span>
                  {isWin && <Crown className="size-5 text-[#fbbf24]" />}
                </label>
              </li>
            );
          })}
        </ul>

        {winnerName ? (
          <div className="mb-3 rounded-xl border border-[#fbbf24]/50 bg-[rgba(251,191,36,.1)] px-4 py-3 text-center">
            <span className="inline-flex items-center gap-1.5 text-[1.05rem] font-extrabold text-[#fbbf24]">
              <PartyPopper className="size-5" /> {winnerName} makes the next quiz!
            </span>
          </div>
        ) : null}

        <Button type="button" size="lg" className="w-full" onClick={spin} disabled={!canSpin}>
          {spinning ? (
            'Spinning…'
          ) : winnerName ? (
            <>
              Spin again <RotateCw className="size-4" />
            </>
          ) : (
            <>
              Spin ({selected.size}) <RotateCw className="size-4" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
