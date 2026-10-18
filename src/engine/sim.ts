/* ------------------------------------------------------------------
   sim.ts - the three laws, as numbers that other things read.

       STILLNESS RESOLVES.  MOTION SCATTERS.  ATTENTION PULLS.

   Energy is what the visitor puts into the world by moving the pointer
   or travelling through it. It decays. Stillness is the absence of
   energy, and stillness is what lets the layers sum. Attention is
   where the visitor is looking, and it only counts while they are
   still - you cannot look closely at something while thrashing about.

   Every number here is mutated in place and read inside the frame
   loop. None of it is React state.
   ------------------------------------------------------------------ */

import { clamp, crit, damp, smooth } from '../lib/mathx';
import { Harmonograph } from '../world/harmonograph';
import {
  dominantModule,
  moduleWeight,
  MODULES,
  nextModule,
  type ModuleId,
} from '../world/journey';
import {
  LAYER_DEFS,
  LAYER_IDS,
  makeLayerRuntime,
  type LayerId,
  type LayerRuntime,
} from '../world/layers';

const SPRING_OUT: [number, number] = [0, 0];

export class Simulation {
  /** seconds since the world was built */
  t = 0;
  /** energy the visitor has put in, 0..1.4 */
  E = 0;
  /** seconds without energy */
  stillT = 0;
  /** seconds spent standing at the vantage with the subject resolved */
  lockT = 0;
  /** 0..1, how settled the world is */
  still = 0;
  /** how fast the camera is travelling, world units per second */
  pathSpeed = 0;
  /** 0..1: 1 when the eye is exactly at the vantage and the layers sum */
  lock = 0;
  /** distance from the vantage, world units */
  err = 0;
  /** the pointer ray hitting the word plane, world units. Layers scale it along their own ray. */
  readonly attentionPoint: [number, number, number] = [0, 0, -10];
  /** the pointer ray itself: each module asks it a different question */
  readonly rayOrigin: [number, number, number] = [0, 0, 0];
  readonly rayDir: [number, number, number] = [0, 0, -1];
  /** true while the pointer is over the world at all */
  pointerPresent = false;
  /** 0..1 how much weight to give the attention point at all */
  attentionStrength = 0;
  /** true while the visitor is pressing: asking harder */
  press = 0;

  hovered: LayerId | null = null;
  focused: LayerId | null = null;

  /* ---- the journey ---------------------------------------------- */
  /** how far the pivot has travelled; written by the camera each frame */
  travel = 0;
  /** the module the visitor would say they are in */
  module: ModuleId = 'vantage';
  /** how present each module is, 0..1: what the renderers gate on */
  readonly weights: Record<ModuleId, number> = {
    vantage: 1,
    inside: 0,
    edge: 0,
    deep: 0,
  };
  /** modules whose point the visitor has met; the ember then looks onward */
  readonly met = new Set<ModuleId>();
  /** the module the ember is currently inviting the visitor toward */
  invitation: ModuleId | null = null;

  readonly layers: Record<LayerId, LayerRuntime>;
  readonly figure = new Harmonograph(0.31);
  readonly discovered = new Set<LayerId>();

  /** set by whoever is honouring the preference; the laws soften rather than stop */
  reducedMotion = false;

  /** global fade of everything drawn: the void before the visitor begins */
  reveal = 0;
  revealTarget = 0;

  private lockS = 0;

  constructor() {
    this.layers = Object.fromEntries(
      LAYER_DEFS.map((d) => [d.id, makeLayerRuntime(d)]),
    ) as Record<LayerId, LayerRuntime>;
  }

  /** first time a layer is attended to, the figure gains a locus */
  discover(id: LayerId): boolean {
    if (this.discovered.has(id)) return false;
    this.discovered.add(id);
    this.figure.express(id, 1);
    // what the visitor does also shapes the figure, not just what they find
    this.figure.express('curiosity', 0.22);
    this.figure.express('memory', 0.14);
    if (this.discovered.size >= 3) this.figure.express('balance', 0.3);
    if (this.discovered.size === 5) this.figure.express('ideas', 0.5);
    return true;
  }

  /**
   * One step of the world. `pointerSpeed` is in viewport-heights per
   * second; `pathSpeed` is how fast the camera itself is moving, so
   * that standing still at the vantage keeps the subject crisp even
   * while the visitor turns the wheel.
   */
  update(dt: number, pointerSpeed: number, press: boolean): void {
    this.t += dt;
    this.press = damp(this.press, press ? 1 : 0, 6, dt);

    const target = clamp(pointerSpeed * 0.85 + this.pathSpeed * 0.09, 0, 1.4);
    this.E = damp(this.E, target, target > this.E ? 12 : 1.7, dt);
    if (this.E > 0.09) this.stillT = 0;
    else this.stillT += dt;
    this.still = smooth(0.15, 1.3, this.stillT);

    const lockTarget = 1 - smooth(0.01, 0.17, this.err);
    this.lockS = damp(this.lockS, lockTarget, lockTarget > this.lockS ? 5 : 14, dt);
    this.lock = this.lockS;
    // arriving is not the same as having been here: this counts the
    // time the subject has actually been resolved in front of them
    if (this.lock > 0.85 && this.still > 0.5) this.lockT += dt;
    else this.lockT = 0;

    // attention only counts while still, and a focused layer is attended to regardless
    this.attentionStrength = damp(
      this.attentionStrength,
      this.hovered || this.focused ? 0.35 + 0.65 * this.still : 0,
      3,
      dt,
    );

    const motionScale = this.reducedMotion ? 0.45 : 1;

    for (let i = 0; i < LAYER_IDS.length; i++) {
      const L = this.layers[LAYER_IDS[i]];
      const def = L.def;
      const res = def.response;

      // MOTION: each layer answers in its own time, and stillness takes it back
      const mTarget = clamp(this.E, 0, 1) * (1 - this.still * 0.65) * motionScale;
      crit(L.motion, L.vMotion, mTarget, res.returnW, dt, SPRING_OUT);
      L.motion = SPRING_OUT[0];
      L.vMotion = SPRING_OUT[1];

      // ATTENTION: hovering or focusing this layer, raised by stillness
      const focusAmt = this.focused === L.id ? 1 : 0;
      const hoverAmt = this.hovered === L.id ? 0.75 : 0;
      const aTarget = clamp(
        Math.max(focusAmt, hoverAmt) * (0.4 + 0.6 * this.still) + this.press * hoverAmt * 0.25,
        0,
        1,
      );
      L.attention = damp(L.attention, aTarget, aTarget > L.attention ? 3.5 : 1.1, dt);
      L.focus = damp(L.focus, focusAmt, 4, dt);

      // what the laws actually move
      const sepTarget = L.motion * res.motionGain * 0.33;
      crit(L.separation, L.vSeparation, sepTarget, res.returnW * 0.8, dt, SPRING_OUT);
      L.separation = SPRING_OUT[0];
      L.vSeparation = SPRING_OUT[1];

      L.distortion = clamp(L.motion, 0, 1);
      L.depthScale = 1 + L.motion * 0.05 + L.focus * 0.02;

      // resolution means something different to each layer
      switch (res.motion) {
        case 'coarsen':
          L.resolution = clamp(1 - L.motion * 0.85 + L.attention * 0.3, 0.08, 1.35);
          break;
        case 'disperse':
          L.resolution = clamp(1 - L.motion, 0, 1);
          break;
        case 'smear':
          L.resolution = clamp(this.still * 0.7 + L.attention * 0.5, 0, 1);
          break;
        default:
          L.resolution = clamp(1 - L.motion * 0.5 + L.attention * 0.2, 0, 1.2);
          break;
      }

      // the five layers belong to module I: they fade as the visitor
      // travels away from it, and cost nothing once the group is off
      L.visibility = this.weights.vantage;
    }

    /* ---- where in the journey, and what is being offered next ---- */
    for (const m of MODULES) this.weights[m.id] = moduleWeight(m, this.travel);
    const here = dominantModule(this.travel);
    this.module = here.id;

    // A module is "met" once the visitor has done the thing it exists
    // to teach. Nothing is gated on it: it only decides whether the
    // ember has started looking at the next place.
    if (here.id === 'vantage' && (this.discovered.size >= 2 || this.lockT > 6)) {
      this.met.add('vantage');
    }
    if (here.id !== 'vantage' && this.weights[here.id] > 0.75) this.met.add(here.id);
    const onward = nextModule(here.id);
    this.invitation = this.met.has(here.id) && onward ? onward.id : null;

    this.reveal = damp(this.reveal, this.revealTarget, this.reducedMotion ? 3 : 1.5, dt);
    this.figure.update(dt, this.still, this.reducedMotion);
  }

  /** a short sentence for the live region: what the world is doing right now */
  describe(): string {
    if (this.module !== 'vantage') {
      const m = MODULES.find((x) => x.id === this.module);
      return m ? `${m.title}. ${m.says}` : this.module;
    }
    if (this.focused) {
      const d = this.layers[this.focused].def;
      return `${d.id}, ${d.verb.toLowerCase()}. ${d.says}`;
    }
    if (this.lock > 0.75 && this.still > 0.6) return 'At the vantage. The layers have resolved into the name.';
    if (this.E > 0.4) return 'Moving. The layers are scattering apart.';
    if (this.lock > 0.75) return 'At the vantage. Hold still and the layers will resolve.';
    return 'Away from the vantage. Five separate sheets of light.';
  }
}

export const sim = new Simulation();
