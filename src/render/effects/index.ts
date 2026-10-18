/* ------------------------------------------------------------------
   effects/index.ts - what the engine knows how to draw.

   Four real treatments, registered once. Phase 2 adds to this list;
   nothing else has to change, because a slot only ever asks the
   registry for an id.
   ------------------------------------------------------------------ */

import {
  hasEffect,
  registerEffect,
  type EffectDefinition,
} from '../../engine/effects/registry';
import { atmosphereEffect } from './atmosphere';
import { fieldHalftoneEffect, fieldPointsEffect } from './field';
import { latticeCellsEffect } from './lattice';

/**
 * Guarded per id rather than with a module flag: in development this
 * module is replaced on edit while the registry module is not, and a
 * module flag would make every hot update throw.
 */
function add<P extends object>(def: EffectDefinition<P>): void {
  if (!hasEffect(def.id)) registerEffect(def);
}

export function registerBuiltinEffects(): void {
  add(fieldPointsEffect);
  add(fieldHalftoneEffect);
  add(latticeCellsEffect);
  add(atmosphereEffect);
}

/** the treatments the visitor may choose between for the field layer */
export const FIELD_TREATMENTS = ['field.points', 'field.halftone'] as const;
export type FieldTreatment = (typeof FIELD_TREATMENTS)[number];
