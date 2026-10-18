/* ------------------------------------------------------------------
   harmonograph.ts - a figure that is drawn, not designed.

   Ported from the original MIRACLE (legacy/js/dna.js). It is a
   harmonograph: the figure a pair of damped pendulums traces. Nothing
   in it is a logo; it is what a handful of springs do when they are
   left to swing, and springs are what this whole world is made of.

   Ten loci. Five are the five layers: attending to a layer raises its
   locus, and the pen has that much more of the path to draw. The other
   five decide the SHAPE:

     curiosity  how finely the pendulums are tuned (2:3, 3:4, 4:5 ...)
     ideas      how round it is
     balance    how strongly the mirrored partner swings
     memory     how long it keeps swinging before it settles
     mutation   how far the pendulums are out of tune

   Complexity is the tuning, not a heap of unrelated pendulums: one
   pair, tuned finer, stays an ordered woven figure however far it
   grows. It belongs to the TRACE layer: residue of a visit.
   ------------------------------------------------------------------ */

import { clamp, damp, lerp, TAU } from '../lib/mathx';

export const LOCI = [
  'instrument',
  'design',
  'lattice',
  'field',
  'trace',
  'curiosity',
  'ideas',
  'balance',
  'memory',
  'mutation',
] as const;

export type Locus = (typeof LOCI)[number];

const INDEX = Object.fromEntries(LOCI.map((n, i) => [n, i])) as Record<Locus, number>;

const MAX_SAMPLES = 1600;

export class Harmonograph {
  /** expression of each locus, 0..1 */
  readonly g = new Float32Array(LOCI.length);
  /** how much of the path the pen has drawn, 0..1 */
  prog = 0;
  private phase = 0;
  private detune = 0.005;
  private ax = 1;
  private delta = 0.03;
  private loops = 4;
  private bAmp = 0.3;
  private lag = 0;
  private fnow = 2;
  private ph0 = 0;
  private ph1 = 1.3;
  private seedPhase: number;

  /** the sampled path: xy pairs in a unit square, |x|,|y| <= 1 */
  readonly px = new Float32Array(MAX_SAMPLES);
  readonly py = new Float32Array(MAX_SAMPLES);

  constructor(seed = 0.31) {
    this.seedPhase = seed;
    this.params();
  }

  /** raise a locus, never past 1. Returns how much it actually rose. */
  express(name: Locus, amount: number): number {
    const i = INDEX[name];
    const before = this.g[i];
    this.g[i] = clamp(before + amount, 0, 1);
    return this.g[i] - before;
  }

  get(name: Locus): number {
    return this.g[INDEX[name]];
  }

  /** how much there is of it: what the pen has to draw */
  complexity(): number {
    let s = 0;
    for (let i = 0; i < 5; i++) s += this.g[i];
    const shape =
      (this.g[INDEX.curiosity] + this.g[INDEX.ideas] + this.g[INDEX.balance] + this.g[INDEX.memory]) / 4;
    return clamp((s / 5) * 0.62 + shape * 0.38, 0, 1);
  }

  private params(): void {
    const cur = this.g[INDEX.curiosity];
    const ide = this.g[INDEX.ideas];
    const bal = this.g[INDEX.balance];
    const mem = this.g[INDEX.memory];
    const mut = this.g[INDEX.mutation];
    this.fnow = 2 + 3 * cur;
    this.ax = lerp(0.6, 1, ide);
    this.bAmp = 0.16 + 0.24 * bal;
    this.lag = (1 - bal) * 0.9;
    this.detune = 0.005 + 0.02 * mut;
    this.ph0 = this.seedPhase * TAU;
    this.ph1 = this.ph0 + 1.3;
    this.delta = 0.034 - 0.022 * mem;
    this.loops = 3.0 + 3.2 * mem + 1.0 * cur;
  }

  /**
   * The pen draws forward as things are found and never backward; it
   * hurries a little when the visitor is still. `reduced` makes it
   * arrive without the slow precession.
   */
  update(dt: number, still: number, reduced: boolean): void {
    const want = 0.16 + 0.84 * this.complexity();
    if (reduced) {
      this.prog = damp(this.prog, want, 4, dt);
    } else {
      this.prog += Math.max(0, want - this.prog) * (1 - Math.exp(-(0.35 + 0.5 * still) * dt));
      this.phase += (0.05 + 0.35 * this.g[INDEX.mutation]) * dt;
    }
    this.params();
  }

  /** sample n points of the path, up to `frac` of its length. Returns n. */
  sample(n: number, frac = this.prog): number {
    const count = Math.min(n, MAX_SAMPLES);
    const m = Math.min(5, Math.max(1, Math.floor(this.fnow)));
    const T = TAU * this.loops * (3 / (m + 1));
    const t1 = T * clamp(frac, 0, 1);
    const off = this.phase;
    const e = this.detune;
    const nrm = 1 / (1 + this.bAmp);
    const fx0 = m * (1 + e);
    const fy0 = (m + 1) * (1 - e);
    const fx1 = (m + 1) * (1 - e * 0.7);
    const fy1 = m * (1 + e * 0.7);
    for (let i = 0; i < count; i++) {
      const tau = (t1 * i) / (count - 1 || 1);
      const x =
        Math.sin(fx0 * tau + this.ph0 + off) + this.bAmp * Math.sin(fx1 * tau + this.ph1 + off);
      const y =
        Math.sin(fy0 * tau + this.ph0 + Math.PI / 2 + off * 0.7) +
        this.bAmp * Math.sin(fy1 * tau + this.ph1 + Math.PI / 2 + this.lag + off * 0.7);
      const d = Math.exp(-this.delta * tau);
      this.px[i] = x * nrm * this.ax * d;
      this.py[i] = y * nrm * d;
    }
    return count;
  }
}
