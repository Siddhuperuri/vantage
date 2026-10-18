/* ------------------------------------------------------------------
   journey.ts - four modules, one space.

   The four parts of this world are not four scenes. They are four
   places along a single axis, and the visitor reaches them by
   travelling, not by a transition. `travel` is one scalar: the
   distance the camera's pivot has moved along the path. Everything
   else - which module is present, how strongly, what the interface
   says, where the ember is going - is a function of it.

       travel 0 ............ 48 ...................... 110
              VANTAGE   INSIDE   EDGE      DEEP
              (0,0,-10) ----- straight down -Z ----> (0,0,-58)
                                      then the floor lets go: -Y

   Pure data and arithmetic: no three, no React.
   ------------------------------------------------------------------ */

import { clamp, smooth } from '../lib/mathx';

export const MODULE_IDS = ['vantage', 'inside', 'edge', 'deep'] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export interface ModuleDef {
  readonly id: ModuleId;
  readonly index: number;
  readonly numeral: string;
  readonly title: string;
  /** one line, shown in the interface and read by assistive technology */
  readonly says: string;
  /** where the module sits on the travel axis */
  readonly travel: number;
  /** how far its presence reaches, in travel units */
  readonly span: number;
  /** the orbit radius the camera takes when it arrives */
  readonly radius: number;
  /** pitch in degrees on arrival: the deep is entered looking down */
  readonly pitch: number;
}

/** where the path turns from travelling forward to falling */
const FALL_AT = 48;

export const MODULES: readonly ModuleDef[] = [
  {
    id: 'vantage',
    index: 0,
    numeral: 'I',
    title: 'VANTAGE',
    says: 'Five layers of light that add up into a name from one place, and only if you stop.',
    travel: 0,
    span: 19,
    radius: 10,
    pitch: 0,
  },
  {
    id: 'inside',
    index: 1,
    numeral: 'II',
    title: 'THE INSIDE',
    says: 'Inside the name: a wall of words wrapped around you, crossing at the letters they share.',
    travel: 26,
    span: 21,
    radius: 0.6,
    pitch: 0,
  },
  {
    id: 'edge',
    index: 2,
    numeral: 'III',
    title: 'THE EDGE',
    says: 'Everything is put down. What is left is residue, negative space and one drawn figure.',
    travel: 48,
    span: 15,
    radius: 13,
    pitch: 4,
  },
  {
    id: 'deep',
    index: 3,
    numeral: 'IV',
    title: 'THE DEEP',
    says: 'The floor lets go. The same five layers again, in a different relationship, all the way down.',
    travel: 92,
    span: 48,
    radius: 11,
    pitch: -16,
  },
] as const;

export const TRAVEL_MAX = 124;

export const moduleDef = (id: ModuleId): ModuleDef =>
  MODULES[MODULE_IDS.indexOf(id)] as ModuleDef;

/**
 * The pivot the camera orbits, for a given travel. Straight down the
 * axis of the piece, then straight down.
 */
export function journeyPoint(travel: number, out: [number, number, number]): [number, number, number] {
  const t = clamp(travel, 0, TRAVEL_MAX);
  if (t <= FALL_AT) {
    out[0] = 0;
    out[1] = 0;
    out[2] = -10 - t;
  } else {
    // the turn is rounded, so the camera does not hinge on a corner
    const d = t - FALL_AT;
    const bend = Math.min(1, d / 10);
    out[0] = 0;
    out[1] = -(d - 10 * bend * 0.5 * (1 - bend) - 0);
    out[2] = -10 - FALL_AT - 6 * bend * (1 - bend * 0.5);
  }
  return out;
}

/** how present a module is at this travel, 0..1 */
export function moduleWeight(def: ModuleDef, travel: number): number {
  const d = Math.abs(travel - def.travel);
  return 1 - smooth(def.span * 0.5, def.span, d);
}

/** the module the visitor would say they are in */
export function dominantModule(travel: number): ModuleDef {
  let best = MODULES[0];
  let bestW = -1;
  for (const m of MODULES) {
    const w = moduleWeight(m, travel);
    // ties go to the nearer centre, so the name never flickers
    const score = w - Math.abs(travel - m.travel) * 1e-4;
    if (score > bestW) {
      bestW = score;
      best = m;
    }
  }
  return best;
}

/** the next module along, or null at the end of the journey */
export function nextModule(id: ModuleId): ModuleDef | null {
  const i = MODULE_IDS.indexOf(id);
  return i >= 0 && i < MODULES.length - 1 ? MODULES[i + 1] : null;
}

export function prevModule(id: ModuleId): ModuleDef | null {
  const i = MODULE_IDS.indexOf(id);
  return i > 0 ? MODULES[i - 1] : null;
}
