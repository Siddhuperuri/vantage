/* ------------------------------------------------------------------
   PostControl.tsx - which treatment belongs where.

   The print treatments are not a menu of filters. Each has a place on
   the journey, and the places were chosen from what each module is
   about:

     I   VANTAGE   none. It is a measured drawing; printing it would
                   be arguing with it. The scene stays quiet.
     II  THE INSIDE none, and a little selective glow. The room is
                   already dense; a screen over it would be noise.
     III THE EDGE  riso. The wall has gone back to being a draft, so
                   it is printed in two inks, out of register.
     IV  THE DEEP  the fall is a loss of resolution. The same forms
                   are resampled ever more coarsely as the visitor
                   descends: ascii, then halftone, then dither, then
                   pixels.

   A glitch is an event, never an ambience: it fires on arrival in a
   new place and decays.
   ------------------------------------------------------------------ */

import { useEffect, useRef } from 'react';
import { sim } from '../../engine/sim';
import { ORDER, useSystem } from '../../engine/systems';
import { clamp, damp, smooth } from '../../lib/mathx';
import { moduleDef, TRAVEL_MAX } from '../../world/journey';
import { useUi } from '../../ui/store';
import { postChain, type TreatmentId } from './chain';

/** where the descent is, 0 at the edge and 1 at the bottom */
function descent(travel: number): number {
  const from = moduleDef('edge').travel;
  return clamp((travel - from) / (TRAVEL_MAX - from), 0, 1);
}

function treatmentFor(module: string, travel: number): TreatmentId {
  if (module === 'edge') return 'riso';
  if (module === 'deep') {
    const d = descent(travel);
    if (d < 0.3) return 'ascii';
    if (d < 0.52) return 'halftone';
    if (d < 0.76) return 'dither';
    return 'pixel';
  }
  return 'none';
}

function bloomFor(module: string, allowed: boolean): number {
  if (!allowed) return 0;
  // restrained on purpose: over a scene made of thousands of thin
  // lines, a strong glow blurs into a uniform grey haze and the void
  // stops being void
  if (module === 'deep') return 0.16;
  if (module === 'inside') return 0.1;
  return 0;
}

export function PostControl() {
  const override = useUi((s) => s.treatment);
  const quality = useUi((s) => s.quality);
  const lastModule = useRef<string>('vantage');

  useEffect(() => () => postChain.dispose(), []);

  useSystem(ORDER.effect + 1, (dt, t) => {
    const chosen: TreatmentId =
      override === 'auto' ? treatmentFor(sim.module, sim.travel) : override;
    postChain.setTreatment(chosen);

    // the amount eases in with the module's presence, so a treatment
    // never snaps on at a boundary
    const presence = sim.weights[sim.module] ?? 1;
    postChain.amount = clamp(0.35 + 0.65 * presence, 0, 1);

    postChain.bloom = bloomFor(sim.module, quality !== 'low');

    // an event, with a trigger and a duration: arriving somewhere new
    if (sim.module !== lastModule.current) {
      lastModule.current = sim.module;
      postChain.glitch = 1;
    }
    // and the very bottom of the descent, where the window stops being
    // the edge of the work
    const endFlare = smooth(0.93, 1, descent(sim.travel)) * (sim.module === 'deep' ? 1 : 0);
    postChain.glitch = Math.max(damp(postChain.glitch, 0, 2.2, dt), endFlare * 0.5);

    postChain.update(dt, t);
  });

  return null;
}
