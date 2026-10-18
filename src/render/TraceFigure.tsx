/* ------------------------------------------------------------------
   TraceFigure.tsx - the figure a visit draws.

   The harmonograph from world/harmonograph.ts, drawn on the trace
   layer's plane in the negative space below the subject. It is not
   decoration and it is not a logo: it is what this visitor's attention
   did, expressed as the path of a pair of pendulums. Attending to a
   layer for the first time lengthens it.

   The buffer is allocated once and only the live range is drawn, so
   the figure growing costs a draw-range change rather than a new
   geometry.
   ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Line,
  LineBasicMaterial,
} from 'three';
import { sim } from '../engine/sim';
import { ORDER, useSystem } from '../engine/systems';
import { clamp, damp } from '../lib/mathx';
import { D0, layerDef } from '../world/layers';
import { PAPER } from './palette';
import { useWorld } from './WorldContext';

const SAMPLES = 1100;

export function TraceFigure() {
  const { world } = useWorld();
  const def = layerDef('trace');

  const { line, geometry, material, positions, place } = useMemo(() => {
    const k = def.depth / D0;
    const halfW = ((world.word.bbox.x1 - world.word.bbox.x0) / 2) * world.scale;
    const g = new BufferGeometry();
    const pos = new Float32Array(SAMPLES * 3);
    const attr = new BufferAttribute(pos, 3);
    attr.setUsage(DynamicDrawUsage);
    g.setAttribute('position', attr);
    g.setDrawRange(0, 0);
    const m = new LineBasicMaterial({
      color: PAPER.clone(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const l = new Line(g, m);
    l.frustumCulled = false;
    l.name = 'trace-figure';
    return {
      line: l,
      geometry: g,
      material: m,
      positions: pos,
      // in the void below the subject, off the axis: the asymmetry is the point
      place: { x: halfW * k * 0.52, y: -1.38 * k, z: -def.depth, size: 0.72 * k },
    };
  }, [world, def]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const lastProg = useRef(-1);
  const opacity = useRef(0);

  useSystem(ORDER.follow, (dt) => {
    const prog = sim.figure.prog;
    // only rewrite the buffer when the pen has actually moved
    if (Math.abs(prog - lastProg.current) > 0.0015) {
      lastProg.current = prog;
      const n = sim.figure.sample(SAMPLES, prog);
      for (let i = 0; i < n; i++) {
        positions[i * 3] = place.x + sim.figure.px[i] * place.size;
        positions[i * 3 + 1] = place.y + sim.figure.py[i] * place.size;
        positions[i * 3 + 2] = place.z;
      }
      (geometry.getAttribute('position') as BufferAttribute).needsUpdate = true;
      geometry.setDrawRange(0, prog > 0.01 ? n : 0);
    }

    // it is clearest when the world is settled: residue, not signal
    const want =
      sim.reveal * clamp(0.06 + 0.17 * sim.still + 0.28 * sim.layers.trace.attention, 0, 0.42);
    opacity.current = damp(opacity.current, want, 2.4, dt);
    material.opacity = opacity.current;
    line.visible = opacity.current > 0.004 && lastProg.current > 0.01;
  });

  return <primitive object={line} />;
}
