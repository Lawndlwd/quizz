import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { sound } from '@/lib/sound';
import {
  type Body,
  collideBodies,
  collideSegment,
  renderBody,
  runLoop,
  STEP,
  shuffled,
  unstick,
} from './physics';
import {
  BALL_RESTITUTION,
  buildPegLattice,
  PEG_R,
  type Peg,
  spawnAbove,
  stepPlinkoBall,
} from './plinko';
import { attachElements, Ball, type PickerGameProps, useLatest } from './shared';

// Fixed logical board — physics always run at this size; the view is scaled to fit.
const BOARD_W = 528;
const BOARD_H = 360;
const BIN_H = 64;
const MIN_BIN_W = 48; // two balls side by side
const RED_SHARE = 0.3; // share of slots that keep you in the draw
const RED_SHARE_FINAL = 0.5; // with few players left, more red so rounds resolve faster
const INTRO_S = 1;
const RESOLVE_S = 1.4;
const SETTLE_S = 1.2; // after the last ball enters a slot, wait at most this long for it to rest

interface BinLayout {
  count: number;
  red: Set<number>;
}

/**
 * Plinko Elimination: balls drop into slots at the bottom. Landing in a green SAFE slot
 * takes you out of the draw; landing in a red slot keeps you in. Red slots are reshuffled
 * every round; rounds repeat until one player is left — they make the quiz. If nobody
 * lands in red, the same players drop again.
 */
export function PlinkoElimination({ players, onStatus, onFinish }: PickerGameProps) {
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const elementsRef = useRef(new Map<string, HTMLDivElement>());
  const [pegs, setPegs] = useState<Peg[]>([]);
  const [bins, setBins] = useState<BinLayout | null>(null);
  const [danger, setDanger] = useState<Set<string>>(new Set());
  const [round, setRound] = useState(0);
  const cb = useLatest({ onStatus, onFinish });

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const fit = () => setScale(frame.clientWidth / BOARD_W);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    const W = BOARD_W;
    const H = BOARD_H;
    const binTop = H - BIN_H;
    const binCount = Math.max(4, Math.floor(W / MIN_BIN_W));
    const binW = W / binCount;
    const pegList = buildPegLattice(W, 46, binTop - 26);
    setPegs(pegList);

    const elements = elementsRef.current;
    let contenders = shuffled(players.map((p) => p.username));
    let phase: 'intro' | 'drop' | 'resolve' = 'intro';
    let phaseTime = 0;
    let sinceLastSlot = 0;
    let roundNo = 0;
    let bodies: Body[] = [];
    let red = new Set<number>();
    let survivors: string[] = [];
    let winner: string | null = null;
    let slotted = 0;
    const binOf = new Map<string, number>();

    const startRound = () => {
      roundNo++;
      const share = contenders.length <= 3 ? RED_SHARE_FINAL : RED_SHARE;
      const redCount = Math.max(1, Math.round(binCount * share));
      red = new Set(shuffled([...Array(binCount).keys()]).slice(0, redCount));
      setBins({ count: binCount, red });
      setRound(roundNo);
      setDanger(new Set());
      phase = 'intro';
      phaseTime = 0;
      bodies = [];
      binOf.clear();
      for (const el of elements.values()) {
        el.style.opacity = '0';
        el.style.transform = 'translate3d(-100px, -100px, 0)';
      }
      cb.current.onStatus(
        `Round ${roundNo} — ${contenders.length} in the draw. Land in red and you stay in!`,
      );
    };

    const startDrop = () => {
      bodies = spawnAbove(contenders, W);
      attachElements(bodies, elements);
      phase = 'drop';
      phaseTime = 0;
      sinceLastSlot = 0;
      sound.play('drumroll');
    };

    const resolve = () => {
      sound.stop('drumroll');
      survivors = bodies.filter((b) => red.has(binOf.get(b.id) ?? -1)).map((b) => b.id);
      for (const b of bodies) {
        if (!survivors.includes(b.id) && b.el) b.el.style.opacity = '0.2';
      }
      setDanger(new Set(survivors));
      if (survivors.length === 1) {
        cb.current.onStatus(`${survivors[0]} is the last one in the red!`);
      } else if (survivors.length === 0) {
        cb.current.onStatus('Nobody hit red — the same players drop again!');
      } else {
        cb.current.onStatus(`${survivors.length} landed in red — they stay in!`);
      }
      phase = 'resolve';
      phaseTime = 0;
    };

    const stepBall = (b: Body) => {
      stepPlinkoBall(b, pegList, W);
      for (let i = 1; i < binCount; i++) {
        collideSegment(b, i * binW, binTop, i * binW, H, 0.3, 0.02);
      }
      if (b.y > H - b.r) {
        b.y = H - b.r;
        if (b.vy > 0) b.vy = -b.vy * 0.2;
        b.vx *= 0.9;
      }
      if (b.y < binTop) unstick(b);
      else b.stillFor = Math.hypot(b.vx, b.vy) < 25 ? b.stillFor + STEP : 0;
      // Inside a slot — or resting on top of a full slot's pile.
      const inSlot = b.y > binTop + b.r * 1.2 || (b.y > binTop - b.r && b.stillFor > 0.5);
      if (!binOf.has(b.id) && inSlot) {
        binOf.set(b.id, Math.min(binCount - 1, Math.max(0, Math.floor(b.x / binW))));
        sinceLastSlot = 0;
        slotted++;
      }
    };

    startRound();

    return runLoop(
      () => {
        phaseTime += STEP;
        if (phase === 'intro') {
          if (phaseTime > INTRO_S) startDrop();
          return;
        }
        for (const b of bodies) stepBall(b);
        collideBodies(bodies, BALL_RESTITUTION);

        if (phase === 'drop') {
          sinceLastSlot += STEP;
          const allSlotted = binOf.size === bodies.length;
          const allResting = bodies.every((b) => Math.hypot(b.vx, b.vy) < 25);
          if (allSlotted && (allResting || sinceLastSlot > SETTLE_S)) resolve();
        } else if (phaseTime > RESOLVE_S) {
          if (survivors.length === 1) winner = survivors[0];
          else {
            if (survivors.length > 0) contenders = survivors;
            startRound();
          }
        }
      },
      () => {
        for (const b of bodies) renderBody(b);
        if (slotted > 0) sound.play('blip');
        slotted = 0;
        if (winner) {
          cb.current.onFinish(winner);
          return true;
        }
        return false;
      },
    );
  }, [players, cb]);

  return (
    <div
      ref={frameRef}
      className="relative w-full overflow-hidden rounded-xl border border-indigo-500/40 bg-[radial-gradient(circle_at_50%_0%,#1e293b,#020617_75%)]"
      style={{ height: BOARD_H * scale }}
    >
      <div
        ref={arenaRef}
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: BOARD_W, height: BOARD_H, transform: `scale(${scale})` }}
      >
        {round > 0 && (
          <div className="absolute top-2 left-3 text-[11px] font-bold tracking-widest text-white/60 uppercase">
            Round {round}
          </div>
        )}
        {pegs.map((peg) => (
          <span
            key={`peg-${peg.x}-${peg.y}`}
            className="absolute rounded-full bg-white/35"
            style={{ width: PEG_R * 2, height: PEG_R * 2, left: peg.x - PEG_R, top: peg.y - PEG_R }}
          />
        ))}
        {bins &&
          [...Array(bins.count).keys()].map((i) => {
            const isRed = bins.red.has(i);
            return (
              <div
                key={`bin-${i}`}
                className={`absolute flex items-end justify-center pb-1 text-[9px] font-extrabold tracking-wide transition-colors duration-500 ${
                  isRed ? 'bg-red-500/30 text-red-200' : 'bg-emerald-500/15 text-emerald-200/80'
                }`}
                style={{
                  left: `${(i / bins.count) * 100}%`,
                  width: `${100 / bins.count}%`,
                  top: BOARD_H - BIN_H,
                  height: BIN_H,
                }}
              >
                {isRed ? 'IN' : 'SAFE'}
              </div>
            );
          })}
        {bins &&
          [...Array(Math.max(0, bins.count - 1)).keys()].map((i) => (
            <div
              key={`div-${i}`}
              className="absolute w-[3px] -translate-x-1/2 rounded-full bg-white/50"
              style={{
                left: `${((i + 1) / bins.count) * 100}%`,
                top: BOARD_H - BIN_H,
                height: BIN_H,
              }}
            />
          ))}
        {players.map((p) => (
          <Ball
            key={p.username}
            player={p}
            elements={elementsRef.current}
            highlight={danger.has(p.username)}
          />
        ))}
      </div>
    </div>
  );
}
