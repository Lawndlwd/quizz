import { type Body, collideCircle, collideWalls, integrate, makeBody, shuffled } from './physics';
import { BALL_R } from './shared';

export interface Peg {
  x: number;
  y: number;
}

export const PEG_R = 4;
const PEG_ROW_GAP = 32;
const PEG_COL_GAP = 36; // 36 - 2*PEG_R = 28px between pegs: a 24px ball barely fits, like a real chip
const WALL_CLEARANCE = BALL_R * 2 + 6; // outermost lane is always wide enough to fall through
const GRAVITY = 500;
const DRAG = 0.8; // chip rubbing the backboard
const PEG_RESTITUTION = 0.3;
const PEG_FRICTION = 0.02;
const PEG_JITTER = 6; // px/s imperfection per peg hit
const WALL_RESTITUTION = 0.5;
export const BALL_RESTITUTION = 0.5;

/** Staggered peg lattice centered in a W×H board. */
export function buildPegLattice(W: number, topY: number, bottomY: number): Peg[] {
  const rows = Math.max(3, Math.floor((bottomY - topY) / PEG_ROW_GAP) + 1);
  const minEdgeX = WALL_CLEARANCE + PEG_R;
  const cols = Math.max(2, Math.floor((W - minEdgeX * 2) / PEG_COL_GAP) + 1);
  const leftX = (W - (cols - 1) * PEG_COL_GAP) / 2;
  const pegs: Peg[] = [];
  for (let row = 0; row < rows; row++) {
    const y = topY + row * PEG_ROW_GAP;
    const offset = row % 2 === 1;
    const rowCols = offset ? cols - 1 : cols;
    const startX = offset ? leftX + PEG_COL_GAP / 2 : leftX;
    for (let col = 0; col < rowCols; col++) pegs.push({ x: startX + col * PEG_COL_GAP, y });
  }
  return pegs;
}

/** One step of a ball falling through a peg board. */
export function stepPlinkoBall(b: Body, pegs: Peg[], W: number) {
  integrate(b, 0, GRAVITY, DRAG);
  collideWalls(b, 0, W, WALL_RESTITUTION);
  for (const peg of pegs)
    collideCircle(b, peg.x, peg.y, PEG_R, PEG_RESTITUTION, PEG_FRICTION, PEG_JITTER);
}

/** Spawns balls above the board at shuffled stagger heights (higher start = later landing). */
export function spawnAbove(usernames: string[], W: number): Body[] {
  const slots = shuffled(usernames.map((_, i) => i));
  const margin = BALL_R + 4;
  return usernames.map((name, i) => {
    const b = makeBody(
      name,
      margin + Math.random() * (W - margin * 2),
      -BALL_R - slots[i] * (BALL_R * 1.5) - Math.random() * 30,
      BALL_R,
    );
    b.vx = (Math.random() - 0.5) * 40;
    return b;
  });
}
