/* ------------------------------------------------------------------
   SpatialLabels.tsx - what each layer says, written on the layer.

   A label is drawn from the same alphabet as the subject and lies on
   its layer's own plane, so it is foreshortened with the sheet it
   names. It is invisible until that layer is attended to, which means
   the composition is never littered with captions: you learn the name
   of a thing by looking at the thing.
   ------------------------------------------------------------------ */

import { useEffect, useMemo } from 'react';
import {
  AdditiveBlending,
  LineBasicMaterial,
  LineSegments,
  type BufferGeometry,
} from 'three';
import { sim } from '../engine/sim';
import { ORDER, useSystem } from '../engine/systems';
import { D0, LAYER_DEFS } from '../world/layers';
import { PAPER } from './palette';
import { segmentsGeometry, textSegments } from './text3d';
import { uiStore } from '../ui/store';
import { useWorld } from './WorldContext';

interface Label {
  id: string;
  object: LineSegments;
  geometry: BufferGeometry;
  material: LineBasicMaterial;
  index: number;
}

export function SpatialLabels() {
  const { world } = useWorld();

  const labels = useMemo<Label[]>(() => {
    const halfW = ((world.word.bbox.x1 - world.word.bbox.x0) / 2) * world.scale;
    return LAYER_DEFS.map((def) => {
      const k = def.depth / D0;
      const size = 0.26 * k;
      const text = `${def.id.toUpperCase()}  ${def.verb}`;
      // stood at the left edge of the sheet, under the baseline, so it
      // sits in the sheet's own margin rather than over the letters
      const data = textSegments(text, {
        x: -halfW * k * 1.0,
        y: -(1.06 + def.index * 0.1) * k,
        z: -def.depth,
        size,
      });
      const geometry = segmentsGeometry(data);
      const material = new LineBasicMaterial({
        color: PAPER.clone(),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const object = new LineSegments(geometry, material);
      object.frustumCulled = false;
      object.name = `label-${def.id}`;
      object.visible = false;
      return { id: def.id, object, geometry, material, index: def.index };
    });
  }, [world]);

  useEffect(
    () => () => {
      labels.forEach((l) => {
        l.geometry.dispose();
        l.material.dispose();
      });
    },
    [labels],
  );

  useSystem(ORDER.follow, () => {
    const show = uiStore.get().labels;
    for (const l of labels) {
      const L = sim.layers[l.id as keyof typeof sim.layers];
      const a = show ? L.attention * 0.5 * sim.reveal : 0;
      l.material.opacity = a;
      l.object.visible = a > 0.004;
    }
  });

  return (
    <>
      {labels.map((l) => (
        <primitive key={l.id} object={l.object} />
      ))}
    </>
  );
}
