import type { ThemeId } from '@/types';

export type SoundName =
  | 'tick'
  | 'blip'
  | 'correct'
  | 'wrong'
  | 'drumroll'
  | 'fanfare'
  | 'heartbeat';

const MUTE_KEY = 'quizz:muted';

/**
 * Per-theme oscillator "flavor". Themes swap the default waveform so the same
 * synth recipes take on a different character (e.g. retro = square/chiptune).
 */
type Flavor = { osc: OscillatorType; detune: number };
const FLAVORS: Record<ThemeId, Flavor> = {
  default: { osc: 'sine', detune: 0 },
  neon: { osc: 'sawtooth', detune: 6 },
  paper: { osc: 'sine', detune: 0 },
  space: { osc: 'triangle', detune: -4 },
  retro: { osc: 'square', detune: 0 },
};

class SoundManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private flavor: Flavor = FLAVORS.default;
  private loops = new Map<SoundName, AudioBufferSourceNode>();
  private resumeBound = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    }
  }

  private ensureCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.25;
      this.master.connect(this.ctx.destination);
      // Autoplay policy: resume on the first user gesture, once.
      if (!this.resumeBound) {
        this.resumeBound = true;
        const resume = () => this.ctx?.resume();
        window.addEventListener('pointerdown', resume, { once: true });
        window.addEventListener('keydown', resume, { once: true });
      }
    }
    return this.ctx;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (typeof window !== 'undefined') {
      if (m) localStorage.setItem(MUTE_KEY, '1');
      else localStorage.removeItem(MUTE_KEY);
    }
    if (m) this.stop();
  }

  isMuted(): boolean {
    return this.muted;
  }

  setFlavor(theme: ThemeId): void {
    this.flavor = FLAVORS[theme] ?? FLAVORS.default;
  }

  play(name: SoundName): void {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    // Cheap no-op when already running; won't unlock a suspended context, but
    // by the time gameplay sounds fire the user has already interacted.
    void ctx.resume();
    if (ctx.state === 'suspended') return; // drop, don't queue

    switch (name) {
      case 'tick':
        this.blip(1100, 0.04, 'square', 0.6);
        break;
      case 'blip':
        this.sweep(660, 880, 0.09, this.flavor.osc);
        break;
      case 'correct':
        this.correctChime();
        break;
      case 'wrong':
        this.wrongBuzzer();
        break;
      case 'heartbeat':
        this.heartbeat();
        break;
      case 'drumroll':
        this.drumroll();
        break;
      case 'fanfare':
        this.fanfare();
        break;
    }
  }

  stop(name?: SoundName): void {
    if (name) {
      const node = this.loops.get(name);
      if (node) {
        try {
          node.stop();
        } catch {
          /* already stopped */
        }
        this.loops.delete(name);
      }
      return;
    }
    for (const node of this.loops.values()) {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
    }
    this.loops.clear();
  }

  // --- synth primitives (all guard on an initialized context) ---

  private tone(freq: number, dur: number, osc: OscillatorType, startAt: number, gain = 1): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = osc;
    o.frequency.value = freq;
    o.detune.value = this.flavor.detune;
    const t = startAt;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private blip(freq: number, dur: number, osc: OscillatorType, gain = 1): void {
    if (!this.ctx) return;
    this.tone(freq, dur, osc, this.ctx.currentTime, gain);
  }

  private sweep(from: number, to: number, dur: number, osc: OscillatorType): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = osc;
    const t = ctx.currentTime;
    o.frequency.setValueAtTime(from, t);
    o.frequency.linearRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.8, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  /** Bright rising 3-note chime with a shimmer layer — "you got it". */
  private correctChime(): void {
    if (!this.ctx) return;
    const base = this.ctx.currentTime;
    const notes = [523.25, 659.25, 987.77]; // C5 · E5 · B5
    notes.forEach((f, i) => {
      const at = base + i * 0.1;
      this.tone(f, 0.3, 'triangle', at, 0.6); // body
      this.tone(f * 2, 0.22, 'sine', at, 0.18); // shimmer octave
    });
    // A held major-third pad underneath so it rings instead of blipping.
    this.pad(523.25, 0.55, base, 0.22);
    this.pad(659.25, 0.55, base, 0.18);
  }

  /**
   * Game-show "wrong" buzzer: two detuned low sawtooths beating against each
   * other in two short blasts, through a lowpass so it's a fat honk, not a click.
   */
  private wrongBuzzer(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.connect(master);

    const blast = (startAt: number, dur: number) => {
      for (const detune of [0, 18, -18]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.value = 150;
        o.detune.value = detune;
        g.gain.setValueAtTime(0, startAt);
        g.gain.linearRampToValueAtTime(0.5, startAt + 0.02);
        g.gain.setValueAtTime(0.5, startAt + dur - 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
        o.connect(g).connect(lp);
        o.start(startAt);
        o.stop(startAt + dur + 0.02);
      }
    };
    const t = ctx.currentTime;
    blast(t, 0.22);
    blast(t + 0.28, 0.34); // second, longer blast — the classic "ehh-ehhh"
  }

  /** A soft sustained sine used to give chimes some ring/tail. */
  private pad(freq: number, dur: number, startAt: number, gain: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, startAt);
    g.gain.linearRampToValueAtTime(gain, startAt + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
    o.connect(g).connect(master);
    o.start(startAt);
    o.stop(startAt + dur + 0.02);
  }

  private heartbeat(): void {
    if (!this.ctx) return;
    const base = this.ctx.currentTime;
    this.tone(55, 0.09, 'sine', base, 1);
    this.tone(55, 0.09, 'sine', base + 0.18, 0.8);
  }

  private fanfare(): void {
    if (!this.ctx) return;
    const base = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this.tone(f, 0.16, 'triangle', base + i * 0.12, 0.8);
    });
    // cymbal-ish noise burst on the final note
    this.noiseBurst(base + notes.length * 0.12, 0.4, 4000);
  }

  private noiseBurst(startAt: number, dur: number, hp: number): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1; // deterministic pseudo-noise
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, startAt);
    g.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
    src.connect(filter).connect(g).connect(master);
    src.start(startAt);
    src.stop(startAt + dur + 0.02);
  }

  private drumroll(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    this.stop('drumroll');
    // 1s looping buffer of rapid filtered-noise hits.
    const dur = 1;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    const hitEvery = Math.floor(ctx.sampleRate / 24); // ~24 hits/sec
    for (let i = 0; i < data.length; i++) {
      const pos = i % hitEvery;
      const env = Math.max(0, 1 - pos / (hitEvery * 0.5));
      const noise = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 2 - 1;
      data[i] = noise * env * 0.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    src.connect(filter).connect(master);
    src.start();
    this.loops.set('drumroll', src);
  }
}

export const sound = new SoundManager();
