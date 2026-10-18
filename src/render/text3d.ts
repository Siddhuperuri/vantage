/* ------------------------------------------------------------------
   text3d.ts - typography as geometry, in the world.

   The same stroke alphabet that builds the subject builds every label.
   Nothing is a texture, a sprite or an HTML element pinned to a 3D
   point: a label is a line mesh standing on a layer's own plane, so it
   foreshortens with that plane and belongs to the thing it names.
   ------------------------------------------------------------------ */

import { BufferAttribute, BufferGeometry } from 'three';
import { textStrokes, type Stroke } from '../world/glyphs';

export interface TextPlacement {
  /** origin on the plane, world units */
  x: number;
  y: number;
  z: number;
  /** cap height in world units */
  size: number;
  track?: number;
  ticks?: boolean;
}

/** segment pairs for a line of text laid on the z = place.z plane */
export function textSegments(str: string, place: TextPlacement): Float32Array {
  const t = textStrokes(str, { track: place.track ?? 0.3, ticks: place.ticks ?? false });
  return strokeSegments(t.strokes, place);
}

export function strokeSegments(strokes: readonly Stroke[], place: TextPlacement): Float32Array {
  const out: number[] = [];
  for (const pts of strokes) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      out.push(
        place.x + a[0] * place.size,
        place.y + a[1] * place.size,
        place.z,
        place.x + b[0] * place.size,
        place.y + b[1] * place.size,
        place.z,
      );
    }
  }
  return new Float32Array(out);
}

export function textWidth(str: string, size: number, track = 0.3): number {
  return textStrokes(str, { track, ticks: false }).width * size;
}

export function segmentsGeometry(data: Float32Array): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(data, 3));
  g.computeBoundingSphere();
  return g;
}
