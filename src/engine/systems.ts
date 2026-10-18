/* ------------------------------------------------------------------
   systems.ts - one frame, one owner, one order.

   R3F will happily run a dozen independent useFrame callbacks in mount
   order. That is how a camera ends up being written by two things in
   the same frame and jumping. Here there is exactly one useFrame in
   the whole piece (see render/Director.tsx); everything else
   registers an update at a declared order and is called from it.

      0  input decay
     10  camera          (the only writer of camera transform)
     20  simulation      (the three laws)
     30  layers          (read the laws, write uniforms)
     40  ember, labels   (follow the layers)
     90  effects         (atmosphere and swappable treatments)
   ------------------------------------------------------------------ */

import { useEffect, useRef } from 'react';

export type SystemUpdate = (dt: number, t: number) => void;

export const ORDER = {
  input: 0,
  camera: 10,
  sim: 20,
  layer: 30,
  follow: 40,
  effect: 90,
} as const;

interface Entry {
  order: number;
  fn: SystemUpdate;
  id: number;
}

class Systems {
  private entries: Entry[] = [];
  private nextId = 1;
  private dirty = false;

  add(order: number, fn: SystemUpdate): () => void {
    const id = this.nextId++;
    this.entries.push({ order, fn, id });
    this.dirty = true;
    return () => {
      const i = this.entries.findIndex((e) => e.id === id);
      if (i >= 0) this.entries.splice(i, 1);
    };
  }

  run(dt: number, t: number): void {
    if (this.dirty) {
      this.entries.sort((a, b) => a.order - b.order || a.id - b.id);
      this.dirty = false;
    }
    for (let i = 0; i < this.entries.length; i++) this.entries[i].fn(dt, t);
  }

  get size(): number {
    return this.entries.length;
  }
}

export const systems = new Systems();

/**
 * Register an update for the single frame loop. The callback is held in
 * a ref, so an inline arrow function does not re-register every render.
 */
export function useSystem(order: number, fn: SystemUpdate): void {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => systems.add(order, (dt, t) => ref.current(dt, t)), [order]);
}
