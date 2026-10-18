/* ------------------------------------------------------------------
   uniforms.ts - the one place the laws are handed to the GPU.

   Every representation of a layer - lines, cells, points, and whatever
   Phase 2 adds - shares this uniform block, so a new treatment gets
   the laws for free and cannot quietly interpret them differently.
   ------------------------------------------------------------------ */

import { Vector3, type IUniform } from 'three';
import { D0, type LayerDef } from '../world/layers';
import type { LayerRuntime } from '../world/layers';
import type { Simulation } from '../engine/sim';
import { EMBER, PAPER } from './palette';

export type UniformMap = Record<string, IUniform>;

/**
 * A fixed lateral direction per layer, across its own ray. Alternating
 * so that under motion the sheets fan apart instead of sliding as one
 * block - five layers moving the same way would still sum.
 */
export function driftDirection(def: LayerDef): Vector3 {
  const a = (def.index / 5) * Math.PI * 2 + 0.6;
  const sign = def.index % 2 === 0 ? 1 : -1;
  return new Vector3(Math.cos(a) * sign, Math.sin(a) * 0.55 * sign, 0).normalize();
}

export function makeLayerUniforms(def: LayerDef): UniformMap {
  return {
    uTime: { value: 0 },
    uStill: { value: 0 },
    uLock: { value: 0 },
    uMotion: { value: 0 },
    uAttention: { value: 0 },
    uResolution: { value: 1 },
    uDepthScale: { value: 1 },
    uGain: { value: def.gain },
    uOpacity: { value: 1 },
    uReveal: { value: 0 },
    uAttn: { value: new Vector3(0, 0, -D0) },
    uAttnStrength: { value: 0 },
    uAttnRadius: { value: 1.6 },
    uD0: { value: D0 },
    uSeparation: { value: 0 },
    uDrift: { value: driftDirection(def) },
    uColor: { value: PAPER.clone() },
    uEmber: { value: EMBER.clone() },
  };
}

/**
 * Copy one frame of the simulation into a uniform block. `weight` is
 * the effect slot's crossfade, so a treatment being replaced dims as
 * it leaves; the global reveal comes from the simulation itself.
 */
export function syncLayerUniforms(
  u: UniformMap,
  L: LayerRuntime,
  sim: Simulation,
  weight = 1,
): void {
  u.uTime.value = sim.t;
  u.uStill.value = sim.still;
  u.uLock.value = sim.lock;
  u.uMotion.value = L.motion;
  u.uAttention.value = L.attention;
  u.uResolution.value = L.resolution;
  u.uDepthScale.value = L.depthScale;
  u.uSeparation.value = L.separation;
  u.uOpacity.value = L.visibility * weight;
  u.uReveal.value = sim.reveal;
  u.uAttnStrength.value = sim.attentionStrength;
  (u.uAttn.value as Vector3).set(
    sim.attentionPoint[0],
    sim.attentionPoint[1],
    sim.attentionPoint[2],
  );
}
