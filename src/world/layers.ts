/* ------------------------------------------------------------------
   layers.ts - the five ways of making the same subject.

   RADIOLUCENCE: the person is never drawn. Five layers each state
   something that passed through them, and from one viewpoint - the
   vantage V* - they add up. The layer ids, verbs and depths come from
   the original MIRACLE (legacy/js/world.js); the response parameters
   are new, because here the laws act on each layer differently.

   Every representation (lines, cells, points, and whatever Phase 2
   adds) reads the same LayerRuntime struct, so a layer can be
   re-rendered without rebuilding the world.
   ------------------------------------------------------------------ */

export const LAYER_IDS = ['instrument', 'design', 'lattice', 'field', 'trace'] as const;
export type LayerId = (typeof LAYER_IDS)[number];

/** how a layer answers the three laws. Named so the behaviour is readable. */
export interface LayerResponse {
  /**
   * What MOTION does to this layer, as a kind, not just a magnitude.
   * measure  - it does not scatter; it extends its guides to measure the error
   * explode  - its construction comes apart along stroke normals
   * coarsen  - its quantisation gets cruder: resolution is lost
   * disperse - its distribution widens: the stroke dissolves into prior noise
   * smear    - it keeps a lagging ghost of where the gesture was
   */
  readonly motion: 'measure' | 'explode' | 'coarsen' | 'disperse' | 'smear';
  /** how strongly motion acts, in world units of displacement at full energy */
  readonly motionGain: number;
  /**
   * What ATTENTION does. Each reveals a different kind of detail.
   * numerals - the measured dimensions become legible
   * ticks    - the survey marks on every terminal grow
   * refine   - the cell pitch drops below its resting value
   * collapse - the cloud condenses onto the stroke near the attended point
   * settle   - the separate hand passes converge into one line
   */
  readonly attention: 'numerals' | 'ticks' | 'refine' | 'collapse' | 'settle';
  readonly attentionGain: number;
  /** angular frequency of the spring that carries this layer home (rad/s) */
  readonly returnW: number;
  /** a private, low shimmer that never stops: only the probabilistic layers have it */
  readonly idle: number;
}

export interface LayerDef {
  readonly id: LayerId;
  readonly index: number;
  /** what it says about the subject, one word, as in the original */
  readonly verb: string;
  /** a sentence of plain language, used by the accessible description too */
  readonly says: string;
  /** distance from the vantage to this layer, world units. instrument is farthest. */
  readonly depth: number;
  /** how much per-point relief the sheet has, as a fraction of depth */
  readonly spread: number;
  /** base line/point brightness */
  readonly gain: number;
  readonly response: LayerResponse;
}

/** the vantage sits at the origin; the word plane is this far down -Z */
export const D0 = 10;

export const LAYER_DEFS: readonly LayerDef[] = [
  {
    id: 'instrument',
    index: 0,
    verb: 'MEASURES',
    says: 'Baselines, rulers, dimension lines and registration marks: the reference the rest is judged against.',
    depth: 16.0,
    spread: 0.055,
    gain: 0.3,
    response: { motion: 'measure', motionGain: 0.55, attention: 'numerals', attentionGain: 1, returnW: 5.8, idle: 0 },
  },
  {
    id: 'design',
    index: 1,
    verb: 'ARRANGES',
    says: 'The exact geometry of every letter, with a survey tick on every free terminal.',
    depth: 12.6,
    spread: 0.075,
    gain: 0.44,
    response: { motion: 'explode', motionGain: 1.5, attention: 'ticks', attentionGain: 1, returnW: 4.6, idle: 0 },
  },
  {
    id: 'lattice',
    index: 2,
    verb: 'COMPUTES',
    says: 'The same subject quantised into discrete cells, as a machine would hold it.',
    depth: 9.8,
    spread: 0.1,
    gain: 0.34,
    response: { motion: 'coarsen', motionGain: 3.4, attention: 'refine', attentionGain: 1, returnW: 3.4, idle: 0 },
  },
  {
    id: 'field',
    index: 3,
    verb: 'INFERS',
    says: 'A probability cloud that denoises onto the stroke: what the subject most likely is.',
    depth: 7.6,
    spread: 0.13,
    gain: 0.21,
    response: { motion: 'disperse', motionGain: 2.6, attention: 'collapse', attentionGain: 1, returnW: 2.2, idle: 0.55 },
  },
  {
    id: 'trace',
    index: 4,
    verb: 'SKETCHES',
    says: 'Loose hand passes with overshoot, and the figure a visit draws: gesture, residue, memory.',
    depth: 5.5,
    spread: 0.1,
    gain: 0.11,
    response: { motion: 'smear', motionGain: 1.1, attention: 'settle', attentionGain: 1, returnW: 3.0, idle: 0.28 },
  },
] as const;

export const layerDef = (id: LayerId): LayerDef =>
  LAYER_DEFS[LAYER_IDS.indexOf(id)] as LayerDef;

/* ------------------------------------------------------------------
   The shared parameters. One struct per layer, mutated in place by the
   simulation each frame and read by whatever is drawing it. Nothing
   here is React state: it changes 60 times a second.
   ------------------------------------------------------------------ */
export interface LayerRuntime {
  readonly id: LayerId;
  readonly def: LayerDef;
  /** 0..1 - drawn at all, and how brightly */
  visibility: number;
  /** lateral displacement from the ray, world units. Visible from the vantage: it is what breaks the sum. */
  separation: number;
  /** along-ray depth multiplier. Invisible from the vantage, obvious from anywhere else. */
  depthScale: number;
  /** 0..1 - how far this layer is from its resolved state */
  distortion: number;
  /** 0..1 - the layer's own idea of resolution (cell pitch, pass count, cloud variance) */
  resolution: number;
  /** 0..1 - smoothed response to motion, in this layer's own time */
  motion: number;
  /** 0..1 - smoothed response to attention */
  attention: number;
  /** 0..1 - 1 while this layer is the focused object */
  focus: number;
  /** velocity companions for the springs that carry the above home */
  vSeparation: number;
  vMotion: number;
}

export function makeLayerRuntime(def: LayerDef): LayerRuntime {
  return {
    id: def.id,
    def,
    visibility: 1,
    separation: 0,
    depthScale: 1,
    distortion: 0,
    resolution: 1,
    motion: 0,
    attention: 0,
    focus: 0,
    vSeparation: 0,
    vMotion: 0,
  };
}
