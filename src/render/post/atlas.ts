/* ------------------------------------------------------------------
   atlas.ts - an ASCII atlas drawn from this world's own alphabet.

   The ASCII treatment does not borrow a monospace font from the
   operating system. It builds its character set out of the same
   stroke geometry that draws the subject, ordered by how much ink
   each glyph puts on the page, so the ramp from dark to light is
   measured rather than guessed. The piece therefore reads itself in
   its own letters.
   ------------------------------------------------------------------ */

import { CanvasTexture, LinearFilter, NearestFilter, type Texture } from 'three';
import { textStrokes } from '../../world/glyphs';

/** candidates, from almost no ink to a great deal of it */
const CANDIDATES = [' ', '.', ':', '-', '+', '/', 'I', 'T', 'L', 'A', 'S', 'H', 'D', 'B', '8', 'M'];

export interface AsciiAtlas {
  readonly texture: Texture;
  /** how many cells across the atlas */
  readonly count: number;
  readonly cell: number;
  dispose(): void;
}

/**
 * Draw each candidate into one cell of a strip, measure its coverage,
 * and keep them sorted by coverage so the shader can index the strip
 * directly with luminance.
 */
export function buildAsciiAtlas(cell = 32): AsciiAtlas {
  const measured = CANDIDATES.map((ch) => {
    const t = textStrokes(ch, { ticks: false, track: 0 });
    let ink = 0;
    for (const stroke of t.strokes) {
      for (let i = 1; i < stroke.length; i++) {
        ink += Math.hypot(stroke[i][0] - stroke[i - 1][0], stroke[i][1] - stroke[i - 1][1]);
      }
    }
    return { ch, ink, strokes: t.strokes, width: Math.max(t.width, 0.12) };
  }).sort((a, b) => a.ink - b.ink);

  const count = measured.length;
  const canvas = document.createElement('canvas');
  canvas.width = cell * count;
  canvas.height = cell;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = Math.max(1.5, cell * 0.075);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    measured.forEach((g, i) => {
      const pad = cell * 0.18;
      const inner = cell - pad * 2;
      const scale = Math.min(inner / Math.max(g.width, 0.5), inner);
      const ox = i * cell + (cell - g.width * scale) / 2;
      const oy = cell - pad;
      ctx.beginPath();
      for (const stroke of g.strokes) {
        stroke.forEach((p, k) => {
          const x = ox + p[0] * scale;
          const y = oy - p[1] * scale;
          if (k === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
      }
      ctx.stroke();
    });
  }

  const texture = new CanvasTexture(canvas);
  texture.minFilter = LinearFilter;
  texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return {
    texture,
    count,
    cell,
    dispose() {
      texture.dispose();
    },
  };
}
