/**
 * Tiny fixed-timestep 2D circle physics shared by the quiz-maker picker games.
 * Every game steps the world at STEP seconds; rendering happens once per frame.
 */

export const STEP = 1 / 240; // fixed physics timestep (s) — substeps keep fast balls from tunneling
const MAX_FRAME_DT = 0.05; // cap catch-up after a tab switch / jank

export interface Body {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Rolling angle (rad), purely visual. */
  angle: number;
  /** Seconds since spawn. */
  age: number;
  /** Seconds spent (nearly) motionless — used for "board shake" nudges. */
  stillFor: number;
  /** False once the body has left the game (landed, eliminated, finished). */
  active: boolean;
  el: HTMLDivElement | null;
}

export function makeBody(id: string, x: number, y: number, r: number): Body {
  return { id, x, y, vx: 0, vy: 0, r, angle: 0, age: 0, stillFor: 0, active: true, el: null };
}

/** Gravity + linear drag + position/angle integration for one step. */
export function integrate(b: Body, gx: number, gy: number, dragPerSec: number) {
  const drag = 1 - dragPerSec * STEP;
  b.vx = (b.vx + gx * STEP) * drag;
  b.vy = (b.vy + gy * STEP) * drag;
  b.x += b.vx * STEP;
  b.y += b.vy * STEP;
  b.angle += (b.vx / b.r) * STEP; // rolling: arc length = r * angle
  b.age += STEP;
}

/**
 * Resolves contact with a fixed contact point at distance `dist` along normal (nx, ny):
 * pushes the body out, bounces the normal velocity and rubs some tangential velocity off.
 */
function resolveFixedContact(
  b: Body,
  nx: number,
  ny: number,
  penetration: number,
  restitution: number,
  friction: number,
  jitter: number,
) {
  b.x += nx * penetration;
  b.y += ny * penetration;
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return;
  const tx = -ny;
  const ty = nx;
  const vt = (b.vx * tx + b.vy * ty) * (1 - friction) + (Math.random() - 0.5) * 2 * jitter;
  const newVn = -vn * restitution;
  b.vx = newVn * nx + vt * tx;
  b.vy = newVn * ny + vt * ty;
}

/** Collision against a fixed circle (peg, bumper). Returns true on contact. */
export function collideCircle(
  b: Body,
  cx: number,
  cy: number,
  cr: number,
  restitution: number,
  friction = 0,
  jitter = 0,
): boolean {
  const minDist = b.r + cr;
  const dx = b.x - cx;
  if (dx > minDist || dx < -minDist) return false;
  const dy = b.y - cy;
  if (dy > minDist || dy < -minDist) return false;
  const dist = Math.hypot(dx, dy) || 0.001;
  if (dist >= minDist) return false;
  resolveFixedContact(b, dx / dist, dy / dist, minDist - dist, restitution, friction, jitter);
  return true;
}

/** Collision against a fixed line segment (ramp, divider, floor). Returns true on contact. */
export function collideSegment(
  b: Body,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  restitution: number,
  friction = 0,
): boolean {
  const sx = x2 - x1;
  const sy = y2 - y1;
  const lenSq = sx * sx + sy * sy || 0.001;
  const t = Math.max(0, Math.min(1, ((b.x - x1) * sx + (b.y - y1) * sy) / lenSq));
  const px = x1 + sx * t;
  const py = y1 + sy * t;
  const dx = b.x - px;
  const dy = b.y - py;
  if (dx > b.r || dx < -b.r || dy > b.r || dy < -b.r) return false;
  const dist = Math.hypot(dx, dy) || 0.001;
  if (dist >= b.r) return false;
  resolveFixedContact(b, dx / dist, dy / dist, b.r - dist, restitution, friction, 0);
  return true;
}

/** Vertical side walls. */
export function collideWalls(b: Body, minX: number, maxX: number, restitution: number) {
  if (b.x < minX + b.r) {
    b.x = minX + b.r;
    if (b.vx < 0) b.vx = -b.vx * restitution;
  } else if (b.x > maxX - b.r) {
    b.x = maxX - b.r;
    if (b.vx > 0) b.vx = -b.vx * restitution;
  }
}

/** Equal-mass elastic-ish collisions between every pair of active bodies. */
export function collideBodies(bodies: Body[], restitution: number) {
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    if (!a.active) continue;
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      if (!b.active) continue;
      const minDist = a.r + b.r;
      const dx = b.x - a.x;
      if (dx > minDist || dx < -minDist) continue;
      const dy = b.y - a.y;
      if (dy > minDist || dy < -minDist) continue;
      const dist = Math.hypot(dx, dy) || 0.001;
      if (dist >= minDist) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const half = (minDist - dist) / 2;
      a.x -= nx * half;
      a.y -= ny * half;
      b.x += nx * half;
      b.y += ny * half;

      // Exchange impulse along the contact normal only while approaching.
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (vn < 0) {
        const impulse = (-(1 + restitution) * vn) / 2;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
      }
    }
  }
}

/**
 * "Board shake": a body that sat (nearly) still for `stillTime` seconds — balanced on a
 * peg top, wedged in a pile — gets a small sideways tap, stronger the longer it lingers.
 */
export function unstick(b: Body, speedThreshold = 15, stillTime = 0.25, escalateAfter = 12) {
  if (Math.hypot(b.vx, b.vy) >= speedThreshold) {
    b.stillFor = 0;
    return;
  }
  b.stillFor += STEP;
  if (b.stillFor <= stillTime) return;
  const boost = 1 + Math.min(2, Math.max(0, b.age - escalateAfter) / 6);
  b.vx += (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 40) * boost;
  b.vy -= 30 * boost;
  b.stillFor = 0;
}

/** Writes a body's position/rotation to its DOM node (outer node translates, first child spins). */
export function renderBody(b: Body, offsetY = 0, scale = 1) {
  if (!b.el) return;
  b.el.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r - offsetY}px, 0) scale(${scale})`;
  const spin = b.el.firstElementChild as HTMLElement | null;
  if (spin) spin.style.transform = `rotate(${b.angle}rad)`;
}

/**
 * Runs `step` at a fixed STEP rate and `frame` once per animation frame.
 * `frame` returns true to end the loop. Returns a stop function.
 */
export function runLoop(step: () => void, frame: () => boolean | undefined): () => void {
  let raf = 0;
  let last = performance.now();
  let acc = 0;
  const tick = (now: number) => {
    acc += Math.min(MAX_FRAME_DT, (now - last) / 1000);
    last = now;
    while (acc >= STEP) {
      step();
      acc -= STEP;
    }
    if (frame()) return;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}

/** Unbiased Fisher–Yates shuffle (returns a new array). */
export function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
