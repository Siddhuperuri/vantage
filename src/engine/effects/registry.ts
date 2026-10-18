/* ------------------------------------------------------------------
   registry.ts - the visual engine.

   A visual treatment is not a component here. It is a definition with
   an identity, a category, typed default parameters, per-quality
   overrides, and a factory that returns something ownable: an
   Object3D, an update, a transition weight and a dispose.

   This exists so that the same world data can be drawn several ways
   without rebuilding the world. The field layer is the proof: the
   point cloud in world/vantage.ts is handed to field.points or
   field.halftone, and swapping them disturbs nothing else. Phase 2
   adds treatments by registering more definitions, not by adding
   booleans to a component.

   Deliberately NOT here: lifecycle magic, a scene graph, a dependency
   system. Only what the four registered effects actually need.
   ------------------------------------------------------------------ */

import type * as THREE from 'three';
import type { QualityProfile, QualityTier } from '../quality';
import type { Simulation } from '../sim';
import type { LayerId } from '../../world/layers';
import type { VantageWorld } from '../../world/vantage';

export type EffectCategory = 'representation' | 'atmosphere' | 'structure';

export interface EffectEnv {
  readonly gl: THREE.WebGLRenderer;
  readonly profile: QualityProfile;
  readonly world: VantageWorld;
  readonly sim: Simulation;
}

export interface EffectFrame {
  readonly dt: number;
  readonly t: number;
  /**
   * 0..1 crossfade weight owned by the slot, not the effect. An effect
   * that is being replaced is called with a falling weight until it is
   * disposed, so a swap is never a pop.
   */
  readonly weight: number;
}

export interface EffectInstance<P> {
  /** what the slot mounts into the scene */
  readonly object: THREE.Object3D;
  update(frame: EffectFrame, params: P): void;
  /** release geometry, materials, textures and render targets */
  dispose(): void;
}

export interface EffectDefinition<P extends object = Record<string, never>> {
  readonly id: string;
  readonly label: string;
  readonly category: EffectCategory;
  /** the layer this treatment is a representation of, when it is one */
  readonly layer?: LayerId;
  readonly defaults: P;
  /** parameter overrides applied on top of defaults for a given tier */
  readonly quality?: Partial<Record<QualityTier, Partial<P>>>;
  create(env: EffectEnv): EffectInstance<P>;
}

// the registry is keyed by id; params are checked at the call site, so the
// store itself is intentionally loose about P
type AnyDefinition = EffectDefinition<never>;

const registry = new Map<string, AnyDefinition>();

export function registerEffect<P extends object>(def: EffectDefinition<P>): void {
  if (registry.has(def.id)) {
    throw new Error(`effect ${def.id} is already registered`);
  }
  registry.set(def.id, def as unknown as AnyDefinition);
}

export function hasEffect(id: string): boolean {
  return registry.has(id);
}

export function getEffect<P extends object>(id: string): EffectDefinition<P> {
  const def = registry.get(id);
  if (!def) throw new Error(`unknown effect ${id}`);
  return def as unknown as EffectDefinition<P>;
}

export function listEffects(category?: EffectCategory): AnyDefinition[] {
  const all = Array.from(registry.values());
  return category ? all.filter((d) => d.category === category) : all;
}

/** defaults with the tier overrides folded in */
export function effectParams<P extends object>(def: EffectDefinition<P>, tier: QualityTier): P {
  return { ...def.defaults, ...(def.quality?.[tier] ?? {}) };
}
