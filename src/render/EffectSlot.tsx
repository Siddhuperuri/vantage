/* ------------------------------------------------------------------
   EffectSlot.tsx - a place in the scene where a treatment lives.

   The slot owns the lifecycle the registry promises: create, update
   with a crossfade weight, transition, dispose. When its id changes it
   keeps the outgoing instance alive at a falling weight until it has
   faded, then disposes it. Nothing in the rest of the piece knows that
   a swap happened.
   ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import type { Object3D } from 'three';
import {
  effectParams,
  getEffect,
  type EffectDefinition,
  type EffectInstance,
} from '../engine/effects/registry';
import { sim } from '../engine/sim';
import { ORDER, useSystem } from '../engine/systems';
import { damp } from '../lib/mathx';
import { useWorld } from './WorldContext';

interface Entry<P extends object> {
  key: number;
  def: EffectDefinition<P>;
  inst: EffectInstance<P>;
  object: Object3D;
}

interface SlotProps<P extends object> {
  id: string;
  /** parameter overrides on top of defaults and the quality tier */
  params?: Partial<P>;
  /** seconds a crossfade takes */
  fade?: number;
}

export function EffectSlot<P extends object>({ id, params, fade = 0.5 }: SlotProps<P>) {
  const gl = useThree((s) => s.gl);
  const { world, profile } = useWorld();
  const [entries, setEntries] = useState<Entry<P>[]>([]);
  const weights = useRef(new Map<number, { w: number; target: number }>());
  const nextKey = useRef(1);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // (re)create on a change of id, world or quality tier
  useEffect(() => {
    const def = getEffect<P>(id);
    const inst = def.create({ gl, profile, world, sim });
    const key = nextKey.current++;
    weights.current.set(key, { w: 0, target: 1 });
    // everything already in the slot starts leaving
    weights.current.forEach((v, k) => {
      if (k !== key) v.target = 0;
    });
    setEntries((prev) => [...prev, { key, def, inst, object: inst.object }]);

    return () => {
      const w = weights.current.get(key);
      if (w) w.target = 0;
    };
  }, [id, gl, profile, world]);

  // dispose anything still alive when the slot itself goes away
  useEffect(
    () => () => {
      setEntries((prev) => {
        prev.forEach((e) => e.inst.dispose());
        return [];
      });
      weights.current.clear();
    },
    [],
  );

  useSystem(ORDER.effect, (dt, t) => {
    const lambda = 1 / Math.max(0.05, fade);
    let expired: number[] | null = null;

    for (const e of entries) {
      const w = weights.current.get(e.key);
      if (!w) continue;
      w.w = damp(w.w, w.target, lambda * 6, dt);
      if (w.target === 0 && w.w < 0.01) {
        (expired ??= []).push(e.key);
        w.w = 0;
      }
      e.object.visible = w.w > 0.004;
      const merged = { ...effectParams(e.def, profile.tier), ...paramsRef.current } as P;
      e.inst.update({ dt, t, weight: w.w }, merged);
    }

    if (expired) {
      const gone = new Set(expired);
      setEntries((prev) => {
        prev.filter((e) => gone.has(e.key)).forEach((e) => e.inst.dispose());
        gone.forEach((k) => weights.current.delete(k));
        return prev.filter((e) => !gone.has(e.key));
      });
    }
  });

  return (
    <>
      {entries.map((e) => (
        <primitive key={e.key} object={e.object} />
      ))}
    </>
  );
}
